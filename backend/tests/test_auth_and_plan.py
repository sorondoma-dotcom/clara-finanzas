from sqlalchemy import text

from app.security import hash_token

from .conftest import ORIGIN, PASSWORD, demo_plan, mutation, register

NEW_PASSWORD = 'nueva frase privada muy larga 123!'


def session_count(db) -> int:
    db.commit()
    return db.execute(text('SELECT count(*) FROM sessions')).scalar_one()


def test_registration_hashes_credentials_and_sets_secure_cookie(client, db):
    auth = register(client)
    cookie = client.cookies.get('clara_session')
    assert cookie
    assert len(auth['recoveryCode']) == 43
    stored = db.execute(text('SELECT * FROM users')).mappings().one()
    assert stored['password_hash'].startswith('$argon2id$')
    assert stored['recovery_hash'] == hash_token(auth['recoveryCode'])
    assert db.execute(text('SELECT token_hash FROM sessions')).scalar_one() == hash_token(cookie)
    me = client.get('/api/auth/session')
    assert me.json()['user']['id'] == auth['user']['id']
    assert me.headers['cache-control'] == 'no-store'
    plan = client.get('/api/plan').json()
    assert plan['revision'] == 0 and plan['data']['expenses'] == []


def test_cookie_attributes(client):
    response = mutation(client, '/api/auth/register', {'email': 'cookie@example.com', 'name': 'Persona', 'password': PASSWORD})
    header = response.headers['set-cookie']
    assert 'HttpOnly' in header and 'samesite=strict' in header.lower() and 'Path=/' in header
    assert 'Secure' not in header


def test_anonymous_requests_are_rejected(client):
    assert client.get('/api/plan').status_code == 401
    assert client.get('/api/auth/session').json() == {'error': 'Inicia sesión para continuar.'}


def test_writes_require_origin_marker_json_and_csrf(client):
    auth = register(client)
    body = {'revision': 0, 'data': demo_plan()}
    assert client.put('/api/plan', json=body).status_code == 403
    assert mutation(client, '/api/plan', body, auth['csrfToken'], 'put', origin='https://evil.example').status_code == 403
    assert mutation(client, '/api/plan', body, 'invalid', 'put').status_code == 403
    assert mutation(client, '/api/plan', body, auth['csrfToken'], 'put').status_code == 200
    plain = client.post('/api/auth/logout', content='{}', headers={'Origin': ORIGIN, 'X-Clara-Request': '1', 'Content-Type': 'text/plain', 'X-CSRF-Token': auth['csrfToken']})
    assert plain.status_code == 415
    cross_site = client.post('/api/auth/logout', json={}, headers={'Origin': ORIGIN, 'X-Clara-Request': '1', 'Sec-Fetch-Site': 'cross-site', 'X-CSRF-Token': auth['csrfToken']})
    assert cross_site.status_code == 403


def test_users_are_isolated_and_stale_revisions_conflict(make_client):
    a, b = make_client(), make_client()
    auth_a, auth_b = register(a), register(b, 'dos@example.com')
    plan = demo_plan() | {'income': 9876}
    saved = mutation(a, '/api/plan', {'revision': 0, 'data': plan}, auth_a['csrfToken'], 'put')
    assert saved.json()['revision'] == 1
    assert a.get('/api/plan').json()['data']['income'] == 9876
    assert a.get('/api/plan/revision').json() == {'revision': 1}
    assert b.get('/api/plan').json()['data']['income'] == 0
    assert b.get(f"/api/plan?userId={auth_a['user']['id']}").json()['data']['income'] == 0
    assert mutation(b, '/api/plan', {'revision': 0, 'userId': auth_a['user']['id'], 'data': plan}, auth_b['csrfToken'], 'put').status_code == 400
    conflict = mutation(a, '/api/plan', {'revision': 0, 'data': plan}, auth_a['csrfToken'], 'put')
    assert conflict.status_code == 409


def test_plan_validation_and_sql_injection(client, db):
    auth = register(client)
    csrf = auth['csrfToken']
    data = demo_plan()
    for broken in ({'income': -1}, {'income': 10.001}, {'income': '100'}, {'income': True}, {'unexpected': True}, {'version': 2}):
        assert mutation(client, '/api/plan', {'revision': 0, 'data': data | broken}, csrf, 'put').status_code == 400, broken
    duplicated = data | {'expenses': [data['expenses'][0], data['expenses'][0]]}
    assert mutation(client, '/api/plan', {'revision': 0, 'data': duplicated}, csrf, 'put').status_code == 400
    bad_expense = data | {'expenses': [data['expenses'][0] | {'end': '2020-01'}]}
    assert mutation(client, '/api/plan', {'revision': 0, 'data': bad_expense}, csrf, 'put').status_code == 400
    data['expenses'][0]['name'] = "'; DROP TABLE users; --"
    assert mutation(client, '/api/plan', {'revision': 0, 'data': data}, csrf, 'put').status_code == 200
    assert db.execute(text('SELECT count(*) FROM users')).scalar_one() == 1
    stored = client.get('/api/plan').json()['data']
    assert stored['expenses'][0]['name'] == "'; DROP TABLE users; --"
    assert stored['expenses'][1]['amount'] == 360.5


def test_oversized_bodies_are_refused(client):
    auth = register(client)
    response = mutation(client, '/api/plan', {'revision': 0, 'data': 'x' * 1_100_000}, auth['csrfToken'], 'put')
    assert response.status_code == 413


def test_registration_validation(client):
    assert mutation(client, '/api/auth/register', {'name': 'A', 'email': 'bad', 'password': 'short'}).status_code == 400
    assert mutation(client, '/api/auth/register', {'name': 'A', 'email': 'a@example.com', 'password': 'a' * 20}).status_code == 400
    register(client, 'Mixed@Example.com ')
    duplicate = mutation(client, '/api/auth/register', {'email': 'mixed@example.com', 'name': 'Otra', 'password': PASSWORD})
    assert duplicate.status_code == 400


def test_login_is_generic_and_brute_force_is_limited(make_client):
    client = make_client(auth_rate_limit=3)
    register(client)
    anonymous = make_client(auth_rate_limit=3)
    absent = mutation(anonymous, '/api/auth/login', {'email': 'absent@example.com', 'password': PASSWORD})
    wrong = mutation(anonymous, '/api/auth/login', {'email': 'uno@example.com', 'password': 'wrong'})
    assert absent.status_code == wrong.status_code == 401
    assert absent.json() == wrong.json()
    mutation(anonymous, '/api/auth/login', {'email': 'uno@example.com', 'password': 'wrong'})
    limited = mutation(anonymous, '/api/auth/login', {'email': 'uno@example.com', 'password': PASSWORD})
    assert limited.status_code == 429
    assert int(limited.headers['retry-after']) > 0


def test_logout_and_logout_all_revoke_sessions(make_client, db):
    first, second = make_client(), make_client()
    auth = register(first)
    login = mutation(second, '/api/auth/login', {'email': auth['user']['email'], 'password': PASSWORD})
    assert login.status_code == 200
    assert mutation(first, '/api/auth/logout', {}, auth['csrfToken']).status_code == 204
    assert first.get('/api/plan').status_code == 401
    assert second.get('/api/plan').status_code == 200
    assert mutation(second, '/api/auth/logout-all', {}, login.json()['csrfToken']).status_code == 204
    assert second.get('/api/plan').status_code == 401
    assert session_count(db) == 0


def test_session_idle_expiry_touch_throttling_and_cleanup(client, clock, db):
    register(client)
    initial = db.execute(text('SELECT last_seen FROM sessions')).scalar_one()
    clock.advance(minutes=1)
    client.get('/api/plan')
    db.commit()
    assert db.execute(text('SELECT last_seen FROM sessions')).scalar_one() == initial
    clock.advance(minutes=5, seconds=1)
    client.get('/api/plan')
    db.commit()
    assert db.execute(text('SELECT last_seen FROM sessions')).scalar_one() == clock.value
    clock.advance(days=1, seconds=1)
    expired = client.get('/api/plan')
    assert expired.status_code == 401
    assert 'Max-Age=0' in expired.headers.get('set-cookie', '') or 'expires=' in expired.headers.get('set-cookie', '').lower()
    client.app.state.cleanup()
    assert session_count(db) == 0


def test_session_lifetime_is_absolute_and_limited_to_five(make_client, clock, db):
    first = make_client()
    auth = register(first)
    latest = None
    for _ in range(5):
        clock.advance(seconds=1)
        latest = make_client()
        assert mutation(latest, '/api/auth/login', {'email': auth['user']['email'], 'password': PASSWORD}).status_code == 200
    assert session_count(db) == 5
    assert first.get('/api/plan').status_code == 401
    clock.advance(days=7)
    db.execute(text('UPDATE sessions SET last_seen = :now'), {'now': clock.value})
    db.commit()
    assert latest.get('/api/plan').status_code == 401


def test_password_change_rotates_recovery_and_revokes_other_sessions(make_client):
    client, other = make_client(), make_client()
    auth = register(client)
    mutation(other, '/api/auth/login', {'email': auth['user']['email'], 'password': PASSWORD})
    wrong = mutation(client, '/api/auth/password', {'currentPassword': 'nope', 'password': NEW_PASSWORD}, auth['csrfToken'])
    assert wrong.status_code == 400
    changed = mutation(client, '/api/auth/password', {'currentPassword': PASSWORD, 'password': NEW_PASSWORD}, auth['csrfToken'])
    assert changed.status_code == 200
    assert changed.json()['recoveryCode'] != auth['recoveryCode']
    assert other.get('/api/plan').status_code == 401
    assert client.get('/api/plan').status_code == 200
    assert mutation(client, '/api/auth/logout', {}, changed.json()['csrfToken']).status_code == 204


def test_recovery_is_single_use_and_revokes_sessions(make_client):
    client, anonymous = make_client(), make_client()
    auth = register(client)
    body = {'email': auth['user']['email'], 'recoveryCode': auth['recoveryCode'], 'password': NEW_PASSWORD}
    recovered = mutation(anonymous, '/api/auth/recover', body)
    assert recovered.status_code == 200
    assert recovered.json()['recoveryCode'] != auth['recoveryCode']
    assert client.get('/api/plan').status_code == 401
    assert mutation(anonymous, '/api/auth/recover', body).status_code == 400
    assert mutation(anonymous, '/api/auth/login', {'email': auth['user']['email'], 'password': NEW_PASSWORD}).status_code == 200


def test_session_listing_hides_token_hashes(client):
    register(client)
    result = client.get('/api/auth/sessions').json()
    assert len(result['sessions']) == 1 and result['sessions'][0]['current'] is True
    assert 'token' not in str(result)


def test_tab_bound_to_previous_user_is_rejected(make_client):
    first, second = make_client(), make_client()
    auth_first, auth_second = register(first), register(second, 'switched@example.com')
    assert second.get('/api/plan', headers={'X-Clara-User': auth_first['user']['id']}).status_code == 401
    assert second.get('/api/plan', headers={'X-Clara-User': auth_second['user']['id']}).status_code == 200


def test_indexes_are_used_for_hot_lookups(client, db):
    register(client)
    db.execute(text('SET enable_seqscan = off'))
    for query in ("SELECT * FROM users WHERE email = 'x'", "SELECT * FROM plans WHERE user_id = '00000000-0000-0000-0000-000000000000'", "SELECT * FROM sessions WHERE token_hash = 'x'"):
        plan = '\n'.join(row[0] for row in db.execute(text(f'EXPLAIN {query}')))
        assert 'Index' in plan, plan


def test_production_cookie_headers_and_https_only(make_client):
    client = make_client(environment='production', app_origin='https://clara.example')
    http_client = make_client(environment='production', app_origin='https://clara.example')
    http_client.base_url = 'http://testserver'
    assert http_client.get('/api/plan').status_code == 403
    response = client.post('/api/auth/register', json={'email': 'secure@example.com', 'name': 'Test', 'password': PASSWORD}, headers={'Origin': 'https://clara.example', 'X-Clara-Request': '1'})
    assert response.status_code == 201
    assert response.headers['set-cookie'].startswith('__Host-clara_session=')
    assert 'Secure' in response.headers['set-cookie']
    assert "frame-ancestors 'none'" in response.headers['content-security-policy']
    assert 'max-age=31536000' in response.headers['strict-transport-security']
    assert 'server' not in response.headers and 'x-powered-by' not in response.headers
    assert client.get('/api/plan').status_code == 200
    assert client.get('/api/docs').status_code == 404


def test_unknown_api_routes_and_health(client):
    assert client.get('/api/nothing').json() == {'error': 'Recurso no encontrado.'}
    assert client.get('/healthz').json() == {'status': 'ok'}
