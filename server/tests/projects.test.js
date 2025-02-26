process.env.NODE_ENV = "test";
const request = require("./util/httpRequests.js");
const {
  clearDatabase,
  createUser,
  createOrganisation,
  addUserToOrganisation,
  createProject,
  loginUser,
  createAuthenticatedRequests,
} = require("./util/testHelpers.js");
const knex = require("../database/connection.js");

describe("Projects API", () => {
  let user, organisation, project, authToken, authRequest;

  beforeEach(async () => {
    await clearDatabase();

    // Create a test user
    const userData = {
      email: "project-test@example.com",
      name: "Project Test User",
      password: "password123",
    };
    const userResponse = await createUser(userData);
    user = userResponse.user;
    authToken = userResponse.token;

    // Create authenticated request helper
    authRequest = createAuthenticatedRequests(authToken);

    // Create an organisation
    organisation = await createOrganisation({ name: "Test Organisation" });

    // Add user to organisation
    await addUserToOrganisation(user.id, organisation.id, "ADMIN");

    // Create a project
    project = await createProject({
      name: "Test Project",
      description: "A test project",
      organisation_id: organisation.id,
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  describe("POST /:id/todos", () => {
    it("should create a new todo in the project", async () => {
      const todoData = {
        title: "Test Todo",
        description: "A test todo",
        status: "TODO",
      };

      const response = await authRequest.post(
        `/projects/${project.id}/todos`,
        todoData
      );

      expect(response.status).toBe(201);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("title", todoData.title);
      expect(response.body[0]).toHaveProperty(
        "description",
        todoData.description
      );
      expect(response.body[0]).toHaveProperty("status", todoData.status);
      expect(response.body[0]).toHaveProperty("project_id", project.id);
      expect(response.body[0]).toHaveProperty("created_by", user.id);
    });

    it("should create a todo with optional due_date", async () => {
      const dueDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const todoData = {
        title: "Todo with Due Date",
        description: "A test todo with due date",
        status: "TODO",
        due_date: dueDate,
      };

      const response = await authRequest.post(
        `/projects/${project.id}/todos`,
        todoData
      );

      expect(response.status).toBe(201);
      expect(response.body[0]).toHaveProperty("due_date");
      // The date format might be different when returned from the database
      expect(
        new Date(response.body[0].due_date).toISOString().split("T")[0]
      ).toBe(dueDate);
    });

    it("should return 400 if title is missing", async () => {
      const todoData = {
        description: "A test todo without title",
        status: "TODO",
      };

      const response = await authRequest.post(
        `/projects/${project.id}/todos`,
        todoData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 if status is invalid", async () => {
      const todoData = {
        title: "Invalid Status Todo",
        description: "A test todo with invalid status",
        status: "INVALID_STATUS",
      };

      const response = await authRequest.post(
        `/projects/${project.id}/todos`,
        todoData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 if user is not in the organisation", async () => {
      // Create a new user not in the organisation
      const newUserData = {
        email: "outside-org@example.com",
        name: "Outside User",
        password: "password123",
      };
      const newUserResponse = await createUser(newUserData);
      const newUserToken = newUserResponse.token;
      const newUserRequest = createAuthenticatedRequests(newUserToken);

      const todoData = {
        title: "Unauthorized Todo",
        description: "A test todo from unauthorized user",
        status: "TODO",
      };

      const response = await newUserRequest.post(
        `/projects/${project.id}/todos`,
        todoData
      );

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "error",
        "User is not in the organisation of the project"
      );
    });
  });

  describe("GET /:id/todos", () => {
    beforeEach(async () => {
      // Create some test todos
      await knex("todos").insert([
        {
          title: "First Todo",
          description: "First test todo",
          status: "TODO",
          project_id: project.id,
          created_by: user.id,
        },
        {
          title: "Second Todo",
          description: "Second test todo",
          status: "DOING",
          project_id: project.id,
          created_by: user.id,
        },
      ]);
    });

    it("should return all todos for a project", async () => {
      const response = await authRequest.get(`/projects/${project.id}/todos`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Check that the todos have the expected properties
      expect(response.body[0]).toHaveProperty("title");
      expect(response.body[0]).toHaveProperty("description");
      expect(response.body[0]).toHaveProperty("status");
      expect(response.body[0]).toHaveProperty("project_id", project.id);

      // Check that the todos have different titles
      const titles = response.body.map((todo) => todo.title);
      expect(titles).toContain("First Todo");
      expect(titles).toContain("Second Todo");
    });

    it("should return an empty array if no todos exist for the project", async () => {
      // Create a new project without todos
      const emptyProject = await createProject({
        name: "Empty Project",
        description: "A project with no todos",
        organisation_id: organisation.id,
      });

      const response = await authRequest.get(
        `/projects/${emptyProject.id}/todos`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });
});
