const request = require("supertest");
const express = require("express");
const { connect, closeDatabase, clearDatabase } = require("./helpers/db");

// Sample test to demonstrate the setup
describe("Backend Test Setup", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test("should verify Jest is working", () => {
    expect(true).toBe(true);
  });

  test("should verify environment variables are set", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test("should connect to MongoDB Memory Server", () => {
    const mongoose = require("mongoose");
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
});
