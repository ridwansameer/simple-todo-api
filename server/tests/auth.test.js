process.env.NODE_ENV = "test";
const request = require("./util/httpRequests.js");
const { clearDatabase } = require("./util/testHelpers.js");
const knex = require("../database/connection.js");
const bcrypt = require("bcrypt");

describe("Authentication API", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  describe("POST /auth/register", () => {
    it("should register a new user and return user data with token", async () => {
      const userData = {
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      };

      const response = await request.post("/auth/register", userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email", userData.email);
      expect(response.body.user).toHaveProperty("name", userData.name);
    });

    it("should return 400 if email is invalid", async () => {
      const userData = {
        email: "invalid-email",
        name: "Test User",
        password: "password123",
      };

      const response = await request.post("/auth/register", userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 if password is too short", async () => {
      const userData = {
        email: "test@example.com",
        name: "Test User",
        password: "1234",
      };

      const response = await request.post("/auth/register", userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 if email is already registered", async () => {
      const userData = {
        email: "duplicate@example.com",
        name: "Test User",
        password: "password123",
      };

      // Register the user first time
      await request.post("/auth/register", userData);

      // Try to register with the same email
      const response = await request.post("/auth/register", userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      // Create a test user directly in the database
      const password_hash = await bcrypt.hash("password123", 10);
      await knex("users").insert({
        email: "login-test@example.com",
        name: "Login Test User",
        password_hash,
      });
    });

    it("should login a user and return a token", async () => {
      const loginData = {
        email: "login-test@example.com",
        password: "password123",
      };

      const response = await request.post("/auth/login", loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(typeof response.body.token).toBe("string");
    });

    it("should return 401 if email is not found", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      const response = await request.post("/auth/login", loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
    });

    it("should return 401 if password is incorrect", async () => {
      const loginData = {
        email: "login-test@example.com",
        password: "wrongpassword",
      };

      const response = await request.post("/auth/login", loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
    });
  });
});
