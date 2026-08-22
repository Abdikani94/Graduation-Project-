import assert from 'node:assert/strict';
import test from 'node:test';

import { inStaffScope } from '../src/controllers/studentSearchController.js';

test('student search includes legacy records that have no campus', () => {
  const user = { role: 'Officer', campus: 'Main Campus', department: '' };
  const application = { campus: null, department: 'Computer Application' };
  const student = { campus: null, department: 'Computer Application' };

  assert.equal(inStaffScope(application, student, user), true);
});

test('student search still excludes records from another known campus', () => {
  const user = { role: 'Officer', campus: 'Main Campus', department: '' };
  const application = { campus: 'Campus 3', department: 'Computer Application' };
  const student = { campus: 'Campus 3', department: 'Computer Application' };

  assert.equal(inStaffScope(application, student, user), false);
});
