import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv'

dotenv.config()

const BASE_URL = 'https://reqres.in/api';
const HEADERS = { 'x-api-key':process.env.REQRES_API_KEY || "" };

test.describe('REST API', () => {
  test('auth: successful login returns a token', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/login`, {
      headers: HEADERS,
      data: { email: 'eve.holt@reqres.in', password: 'cityslicka' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
  });

  test('auth: login without password returns 400 with error message', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/login`, {
      headers: HEADERS,
      data: { email: 'eve.holt@reqres.in' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('CRUD: create a new user returns 201 with generated id', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/users`, {
      headers: HEADERS,
      data: { name: 'morpheus', job: 'leader' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('morpheus');
  });

  test('CRUD: get single user returns expected schema', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/users/2`, { headers: HEADERS });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      id: 2,
      email: expect.any(String),
      first_name: expect.any(String),
      last_name: expect.any(String),
    });
  });

  test('CRUD: update user returns 200 with updated fields', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/users/2`, {
      headers: HEADERS,
      data: { name: 'morpheus', job: 'zion resident' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.job).toBe('zion resident');
  });

  test('CRUD: delete user returns 204 with no content', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/users/2`, { headers: HEADERS });
    expect(res.status()).toBe(204);
  });

  test('error handling: requesting a non-existent user returns 404', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/users/999`, { headers: HEADERS });
    expect(res.status()).toBe(404);
  });

  test('schema validation: list users response has expected pagination shape', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/users?page=2`, { headers: HEADERS });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      page: 2,
      per_page: expect.any(Number),
      total: expect.any(Number),
      data: expect.any(Array),
    });
  });
});