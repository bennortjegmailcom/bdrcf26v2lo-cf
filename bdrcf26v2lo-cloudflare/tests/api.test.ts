import { token, accessToken } from './setup';
import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app';
process.env.NODE_ENV = 'test';

test('BDR API v1 — Auth middleware constraints', async (t) => {
  await t.test('No auth header -> 401 unauthenticated', async () => {
    const res = await request(app).get('/api/v1/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');
  });

  await t.test('Invalid token -> 401 unauthenticated', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer invalid-token-string');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');
  });

  await t.test('Valid token -> allows request & returns profile info', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.email, 'test@bdr.com');
  });
});

test('BDR API v1 — Breakdown Reports endpoint operations', async (t) => {
  let createdReportId = '';

  await t.test('Create a valid breakdown report', async () => {
    const payload = {
      equipment: 'Primary Crusher',
      equipmentNumber: 'CR-101',
      reportedFault: 'Crusher drum is blocked',
      urgency: 4,
      workGroup: 'Mechanical',
      details: 'Large rock wedge detected',
    };

    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.equipment, 'Primary Crusher');
    assert.strictEqual(res.body.data.status, 'Active');
    createdReportId = res.body.data.id;
    assert.ok(createdReportId);
  });

  await t.test('Get specific report by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, createdReportId);
    assert.strictEqual(res.body.data.equipmentNumber, 'CR-101');
  });

  await t.test('List reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports?hours=72')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  await t.test('Update allowed fields on report', async () => {
    const updates = {
      details: 'Rock has been cleared from feeder chutes.',
    };

    const res = await request(app)
      .patch(`/api/v1/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updates);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.details, 'Rock has been cleared from feeder chutes.');
    assert.ok(res.body.data.changeLog.length > 1);
  });

  await t.test('Reject updates containing protected/invalid fields', async () => {
    const maliciousPayload = {
      urgency: 'high-urgency-spoof', // should be number
    };

    const res = await request(app)
      .patch(`/api/v1/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(maliciousPayload);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_FAILED');
  });
});

test('BDR API v1 — Lockout State Machine transitions', async (t) => {
  let ticketId = '';

  await t.test('Create lockout ticket creates LOCKOUT_REQUESTED state', async () => {
    const payload = {
      equipment: 'Belt Conveyor 5',
      equipmentNumber: 'CV-105',
      workGroup: 'Mechanical',
      lockoutComments: 'Cleaning belt scraper',
    };

    const res = await request(app)
      .post('/api/v1/lockouts')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.status, 'LOCKOUT_REQUESTED');
    ticketId = res.body.data.id;
    assert.ok(ticketId);
  });

  await t.test('SCADA stop before Equipment Confirmed -> 409 Rejected', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/confirm-scada-stop`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-999', comments: 'Stop confirmation attempt' });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'INVALID_STATE_TRANSITION');
    assert.strictEqual(res.body.error.currentState, 'LOCKOUT_REQUESTED');
  });

  await t.test('Confirm Equipment requires LOCKOUT_REQUESTED -> Success', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/confirm-equipment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-111', qrVerified: true, scannedQrCode: 'QR-CV-105' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'EQUIPMENT_CONFIRMED');
    assert.ok(res.body.data.equipmentConfirmed);
  });

  await t.test('Confirm SCADA Stop requires EQUIPMENT_CONFIRMED -> Success', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/confirm-scada-stop`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-222', comments: 'Stopped conveyor SCADA feedback' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'SCADA_STOP_CONFIRMED');
  });

  await t.test('Confirm Physical Lockout produces LOCKOUT_ACTIVE', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/confirm-physical-lockout`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-333', comments: 'Locks placed on isolator switches' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'LOCKOUT_ACTIVE');
  });

  await t.test('Positive Test requires LOCKOUT_ACTIVE -> Success', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/positive-test`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-444', result: 'PASS', comments: 'Feeder did not kick on' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'POSITIVE_TEST');
  });

  await t.test('Release requires an acknowledged passing test', async () => {
    const denied = await request(app).post(`/api/v1/lockouts/${ticketId}/request-release`)
      .set('Authorization', `Bearer ${token}`).send({ employeeNumber: 'EMP-555' });
    assert.strictEqual(denied.status, 409);
    const ack = await request(app).post(`/api/v1/lockouts/${ticketId}/acknowledge-positive-test`)
      .set('Authorization', `Bearer ${token}`).send({ employeeNumber: 'EMP-555', method: 'APP' });
    assert.strictEqual(ack.status, 200);
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/request-release`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-555', comments: 'Work complete, lock removed' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'RELEASE_REQUESTED');
  });

  await t.test('Confirm Release requires RELEASE_REQUESTED -> Success', async () => {
    const res = await request(app)
      .post(`/api/v1/lockouts/${ticketId}/confirm-release`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeNumber: 'EMP-666', comments: 'Conveyor fully handed back to ops' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'RELEASED');
  });
});

test('BDR API v1 — Sync and Idempotency key behaviors', async (t) => {
  const syncOpId1 = 'sync-op-12345';
  const syncOpId2 = 'sync-op-failed';

  await t.test('Submit initial CREATE_REPORT operation via /sync', async () => {
    const payload = {
      operations: [
        {
          operationId: syncOpId1,
          type: 'CREATE_REPORT',
          payload: {
            equipment: 'Slurry Sump Pump',
            equipmentNumber: 'PP-109',
            reportedFault: 'Pump seal leaking',
            urgency: 2,
            workGroup: 'Mechanical',
          },
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data[0].operationId, syncOpId1);
    assert.strictEqual(res.body.data[0].status, 'SUCCESS');
    assert.ok(res.body.data[0].result.id);
  });

  await t.test('Retrying the exact same operationId does not create duplicate and returns cached response', async () => {
    const payload = {
      operations: [
        {
          operationId: syncOpId1,
          type: 'CREATE_REPORT',
          payload: {
            equipment: 'Slurry Sump Pump',
            equipmentNumber: 'PP-109',
            reportedFault: 'Pump seal leaking',
            urgency: 2,
            workGroup: 'Mechanical',
          },
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data[0].operationId, syncOpId1);
    assert.strictEqual(res.body.data[0].status, 'SUCCESS');
  });

  await t.test('Failed sync operations return FAILED status and remain retryable', async () => {
    const payload = {
      operations: [
        {
          operationId: syncOpId2,
          type: 'CREATE_REPORT',
          payload: {
            equipment: '', // trigger validation failure
            equipmentNumber: 'PP-109',
            reportedFault: '',
            urgency: 22,
            workGroup: 'Mechanical',
          },
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data[0].operationId, syncOpId2);
    assert.strictEqual(res.body.data[0].status, 'FAILED');
  });
});

test('BDR API v1 — Users & Profiles D1 operations', async (t) => {
  const newUserId = 'test-user-d1-44';

  await t.test('Create user in D1', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: newUserId,
        uid: newUserId,
        name: 'Sarah Connor',
        email: 'sarah.connor@matimba.com',
        role: 'Mechanical Supervisor',
        roles: ['Mechanical Supervisor'],
        employeeNumber: 'EMP-771',
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.name, 'Sarah Connor');
  });

  await t.test('List users from D1 includes new user', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find((u: any) => u.id === newUserId);
    assert.ok(found);
  });

  await t.test('Get specific user by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${newUserId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.employeeNumber, 'EMP-771');
  });

  await t.test('Update user details in D1', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${newUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hoursToShow: 48, notificationSound: 'alarm' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hoursToShow, 48);
  });
});

test('BDR API v1 — Artisans & Job Tickets D1 operations', async (t) => {
  const artisanId = 'art-test-99';
  const ticketId = 'ticket-test-99';

  await t.test('Create artisan record in D1', async () => {
    const res = await request(app)
      .post('/api/v1/artisans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: artisanId,
        name: 'Kobus van der Merwe',
        responsibility: 'Fitter',
        shift: 'B',
        employeeNumber: 'EMP-FIT-01',
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.responsibility, 'Fitter');
  });

  await t.test('List artisans retrieves artisan from D1', async () => {
    const res = await request(app)
      .get('/api/v1/artisans')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    const found = res.body.data.find((a: any) => a.id === artisanId);
    assert.ok(found);
  });

  await t.test('Create job ticket in D1', async () => {
    const res = await request(app)
      .post('/api/v1/job-tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: ticketId,
        ticketNumber: 'TKT-2026-99',
        equipment: 'Slag Conveyor 2',
        equipmentNumber: 'CV-202',
        urgency: 4,
        status: 'IN_PROGRESS',
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.equipmentNumber, 'CV-202');
  });

  await t.test('Get job ticket by ID from D1', async () => {
    const res = await request(app)
      .get(`/api/v1/job-tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, ticketId);
  });
});

test('BDR API v1 — Audit Logs & Tamper-Proof Chain in D1', async (t) => {
  await t.test('Append and list audit logs in D1', async () => {
    const res = await request(app)
      .post('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: 'test-user-id',
        userName: 'Test Engineer',
        action: 'CREATE',
        entityType: 'REPORT',
        entityId: 'rep-test-d1',
        details: 'Initial report log test',
        hash: 'sha256-mock-hash-val',
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.action, 'CREATE');

    const listRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.length > 0);
  });
});

test('BDR API v1 — Data Migration Export & Import utility', async (t) => {
  await t.test('Export D1 state snapshot', async () => {
    const res = await request(app)
      .get('/api/v1/migrate/export')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.counts);
    assert.ok(res.body.data);
  });

  await t.test('Import batch data into D1 without duplicating', async () => {
    const importPayload = {
      users: [{ id: 'mig-user-1', uid: 'mig-user-1', name: 'Migrated User', role: 'Reporter' }],
      artisans: [{ id: 'mig-art-1', name: 'Migrated Artisan', responsibility: 'Electrician', shift: 'A' }],
    };
    const res = await request(app)
      .post('/api/v1/migrate/import')
      .set('Authorization', `Bearer ${token}`)
      .send(importPayload);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});



test('Access security regressions', async t => {
  for (const headers of [
    { Authorization: 'Bearer valid-token' },
    { 'cf-access-authenticated-user-email': 'test@bdr.com', 'x-forwarded-email': 'test@bdr.com' },
    { Authorization: `Bearer ${token.split('.').slice(0, 2).join('.')}.invalid` },
    { Authorization: `Bearer ${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ email: 'test@bdr.com', sub: 'test@bdr.com', iss: 'https://bdr-test.cloudflareaccess.com', aud: 'bdr-test-audience', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.` },
    { Authorization: `Bearer ${await accessToken('test@bdr.com', 'wrong-audience')}` },
    { Authorization: `Bearer ${await accessToken('test@bdr.com', 'bdr-test-audience', '1h', 'https://wrong.cloudflareaccess.com')}` },
    { Authorization: `Bearer ${await accessToken('test@bdr.com', 'bdr-test-audience', '-1h')}` },
  ]) {
    const res = await request(app).get('/api/v1/me').set(headers);
    assert.equal(res.status, 401);
  }
  assert.equal((await request(app).post('/api/v1/auth/token').send({ role: 'Admin' })).status, 401);
  const reporter = await accessToken('reporter@example.com');
  const unapproved = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${reporter}`);
  assert.equal(unapproved.status, 401);
  const admin = { Authorization: `Bearer ${token}` };
  const users = await request(app).get('/api/v1/users').set(admin);
  const pending = users.body.data.find((user: any) => user.email === 'reporter@example.com');
  assert.ok(pending);
  const approved = await request(app).patch(`/api/v1/users/${pending.id}`).set(admin).send({ isApproved: true });
  assert.equal(approved.status, 200);
  const profile = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${reporter}`).set('cf-access-authenticated-user-email', 'test@bdr.com');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.role, 'Reporter');
  const result = await request(app).patch(`/api/v1/users/${profile.body.data.id}`)
    .set('Authorization', `Bearer ${reporter}`).send({ role: 'Admin' });
  assert.equal(result.status, 403);
  assert.equal((await request(app).post('/api/v1/migrate/import').set('Authorization', `Bearer ${reporter}`).send({})).status, 403);
  assert.equal((await request(app).get('/api/v1/migrate/export').set('Authorization', `Bearer ${reporter}`)).status, 403);
  assert.equal((await request(app).delete('/api/v1/reports/nonexistent').set('Authorization', `Bearer ${reporter}`)).status, 403);
  assert.equal((await request(app).post('/api/v1/lockouts').set('Authorization', `Bearer ${reporter}`).send({ equipment: 'A', equipmentNumber: 'B', workGroup: 'C' })).status, 403);
  assert.equal((await request(app).get('/api/v1/does-not-exist')).status, 404);
});


test('Cloudflare lockout positive-test submission and acknowledgement persist', async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const created = await request(app).post('/api/v1/lockouts').set(auth).send({ equipment: 'Test belt', equipmentNumber: 'TEST-1', workGroup: 'Mechanical' });
  const id = created.body.data.id;
  for (const [action, payload] of [
    ['confirm-equipment', {}], ['confirm-scada-stop', { employeeNumber: 'EMP-1' }],
    ['confirm-physical-lockout', { employeeNumber: 'EMP-1' }],
    ['request-positive-test', { employeeNumber: 'EMP-1', result: 'PASS', comments: 'Test performed' }],
    ['acknowledge-positive-test', { employeeNumber: 'EMP-2', method: 'APP', comments: 'Control room acknowledged' }],
  ] as const) {
    const result = await request(app).post(`/api/v1/lockouts/${id}/${action}`).set(auth).send(payload);
    assert.equal(result.status, 200, JSON.stringify(result.body));
  }
  const saved = await request(app).get(`/api/v1/lockouts/${id}`).set(auth);
  assert.equal(saved.body.data.status, 'POSITIVE_TEST_ACKNOWLEDGED');
  assert.equal(saved.body.data.positiveTestResult, 'PASS');
  assert.ok(saved.body.data.auditEvents.some((e: any) => e.action === 'ACKNOWLEDGE_POSITIVE_TEST'));
  const release = await request(app).post(`/api/v1/lockouts/${id}/request-release`).set(auth).send({ employeeNumber: 'EMP-2' });
  assert.equal(release.status, 200);
});

test('Reporter cannot perform privileged operations or export data', async () => {
  const adminProfile = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
  assert.equal(adminProfile.status, 200, JSON.stringify(adminProfile.body));
  const reporter = await accessToken('restricted@example.com');
  const auth = { Authorization: `Bearer ${reporter}` };
  await request(app).get('/api/v1/me').set(auth);
  const pendingUsers = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
  const pendingUser = pendingUsers.body.data.find((user: any) => user.email === 'restricted@example.com');
  assert.ok(pendingUser);
  const approved = await request(app).patch(`/api/v1/users/${pendingUser.id}`)
    .set('Authorization', `Bearer ${token}`).send({ isApproved: true });
  assert.equal(approved.status, 200);
  const profile = await request(app).get('/api/v1/me').set(auth);
  assert.equal(profile.status, 200, JSON.stringify(profile.body));
  for (const [method, path, body] of [
    ['post', '/api/v1/lockouts', { equipment: 'Belt', equipmentNumber: 'B1', workGroup: 'Mechanical' }],
    ['post', '/api/v1/job-tickets', { id: 'forbidden' }],
    ['delete', '/api/v1/reports/nonexistent', {}],
    ['post', '/api/v1/reports/purge', { cutoffDate: new Date().toISOString() }],
    ['get', '/api/v1/migrate/export', {}],
    ['put', '/api/v1/metadata/operators', { value: [] }],
  ] as const) {
    const response = await request(app)[method](path).set(auth).send(body);
    assert.equal(response.status, 403, `${method} ${path}: ${JSON.stringify(response.body)}`);
  }
});

test('Shared operators persist in D1 and inline attachments are rejected', async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const operators = [{ id: 'operator-1', name: 'Operator One', shift: 'A' }];
  assert.equal((await request(app).put('/api/v1/metadata/operators').set(auth).send({ value: operators })).status, 200);
  const metadata = await request(app).get('/api/v1/metadata').set(auth);
  assert.deepEqual(metadata.body.data.operators, operators);
  const attachment = await request(app).post('/api/v1/reports').set(auth).send({
    equipment: 'Belt', equipmentNumber: 'B1', reportedFault: 'Fault', urgency: 2,
    workGroup: 'Mechanical', defectImages: ['data:image/png;base64,aGVsbG8='],
  });
  assert.equal(attachment.status, 400);
});

test('Concurrent offline retries use one durable report ID', async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const operation = { operationId: `parallel-${crypto.randomUUID()}`, type: 'CREATE_REPORT', payload: {
    equipment: 'Pump', equipmentNumber: 'RETRY-1', reportedFault: 'Seal leak',
    urgency: 2, workGroup: 'Mechanical',
  } };
  const [first, second] = await Promise.all([
    request(app).post('/api/v1/sync').set(auth).send({ operations: [operation] }),
    request(app).post('/api/v1/sync').set(auth).send({ operations: [operation] }),
  ]);
  assert.equal(first.body.data[0].status, 'SUCCESS');
  assert.equal(second.body.data[0].status, 'SUCCESS');
  assert.equal(first.body.data[0].result.id, second.body.data[0].result.id);
});

test('Concurrent lockout actions reject a stale update', async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const created = await request(app).post('/api/v1/lockouts').set(auth).send({
    equipment: 'Concurrency belt', equipmentNumber: 'RACE-1', workGroup: 'Mechanical',
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  const [first, second] = await Promise.all([
    request(app).post(`/api/v1/lockouts/${id}/confirm-equipment`).set(auth).send({ employeeNumber: 'EMP-1' }),
    request(app).post(`/api/v1/lockouts/${id}/confirm-equipment`).set(auth).send({ employeeNumber: 'EMP-2' }),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 409]);
  const saved = await request(app).get(`/api/v1/lockouts/${id}`).set(auth);
  assert.equal(saved.body.data.auditEvents.filter((event: any) => event.action === 'CONFIRM_EQUIPMENT').length, 1);
});

test('Simultaneous offline retries share one persisted report', async () => {
  const auth = { Authorization: `Bearer ${token}` };
  const operation = { operationId: `race-${crypto.randomUUID()}`, type: 'CREATE_REPORT', payload: {
    equipment: 'Retry pump', equipmentNumber: 'RETRY-1', reportedFault: 'Seal leak', urgency: 2, workGroup: 'Mechanical',
  } };
  const [first, second] = await Promise.all([
    request(app).post('/api/v1/sync').set(auth).send({ operations: [operation] }),
    request(app).post('/api/v1/sync').set(auth).send({ operations: [operation] }),
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.data[0].result.id, second.body.data[0].result.id);
  const list = await request(app).get('/api/v1/reports?hours=72').set(auth);
  assert.equal(list.body.data.filter((report: any) => report.id === first.body.data[0].result.id).length, 1);
});
