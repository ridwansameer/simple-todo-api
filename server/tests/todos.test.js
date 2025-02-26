process.env.NODE_ENV = "test";
const request = require("./util/httpRequests.js");
const {
  clearDatabase,
  createUser,
  createOrganisation,
  addUserToOrganisation,
  createProject,
  createTodo,
  loginUser,
  createAuthenticatedRequests,
} = require("./util/testHelpers.js");
const knex = require("../database/connection.js");

describe("Todos API", () => {
  let users, organisation, project, todo, authToken, authRequest;

  beforeEach(async () => {
    await clearDatabase();

    // Create test users
    const userData1 = {
      email: "todo-test1@example.com",
      name: "Todo Test User 1",
      password: "password123",
    };
    const userData2 = {
      email: "todo-test2@example.com",
      name: "Todo Test User 2",
      password: "password123",
    };

    const userResponse1 = await createUser(userData1);
    const userResponse2 = await createUser(userData2);

    users = [userResponse1.user, userResponse2.user];
    authToken = userResponse1.token;

    // Create authenticated request helper
    authRequest = createAuthenticatedRequests(authToken);

    // Create an organisation
    organisation = await createOrganisation({ name: "Test Organisation" });

    // Add users to organisation
    await addUserToOrganisation(users[0].id, organisation.id, "ADMIN");
    await addUserToOrganisation(users[1].id, organisation.id, "USER");

    // Create a project
    project = await createProject({
      name: "Test Project",
      description: "A test project",
      organisation_id: organisation.id,
    });

    // Create a todo
    todo = await createTodo({
      title: "Test Todo",
      description: "A test todo",
      status: "TODO",
      project_id: project.id,
      created_by: users[0].id,
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  describe("POST /:id/assignments", () => {
    it("should assign users to a todo", async () => {
      const assignmentData = {
        user_ids: [users[0].id, users[1].id],
      };

      const response = await authRequest.post(
        `/todos/${todo.id}/assignments`,
        assignmentData
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty(
        "message",
        "Assignments created successfully"
      );

      // Verify assignments were created in the database
      const assignments = await knex("todo_assignment").where({
        todo_id: todo.id,
      });
      expect(assignments).toHaveLength(2);

      const assignedUserIds = assignments.map((a) => a.user_id);
      expect(assignedUserIds).toContain(users[0].id);
      expect(assignedUserIds).toContain(users[1].id);
    });

    it("should return 400 if user_ids is not an array", async () => {
      const invalidData = {
        user_ids: "not-an-array",
      };

      const response = await authRequest.post(
        `/todos/${todo.id}/assignments`,
        invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 if user_ids contains invalid ids", async () => {
      const invalidData = {
        user_ids: [users[0].id, "invalid-id"],
      };

      const response = await authRequest.post(
        `/todos/${todo.id}/assignments`,
        invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /:id/assignments", () => {
    beforeEach(async () => {
      // Create some assignments
      await knex("todo_assignment").insert([
        { todo_id: todo.id, user_id: users[0].id },
        { todo_id: todo.id, user_id: users[1].id },
      ]);
    });

    it("should return all assignments for a todo", async () => {
      const response = await authRequest.get(`/todos/${todo.id}/assignments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Check that the assignments have the expected properties
      expect(response.body[0]).toHaveProperty("todo_id", todo.id);
      expect(response.body[0]).toHaveProperty("user_id");

      // Check that both users are assigned
      const assignedUserIds = response.body.map((a) => a.user_id);
      expect(assignedUserIds).toContain(users[0].id);
      expect(assignedUserIds).toContain(users[1].id);
    });

    it("should return an empty array if no assignments exist for the todo", async () => {
      // Create a new todo without assignments
      const newTodo = await createTodo({
        title: "Unassigned Todo",
        description: "A todo with no assignments",
        status: "TODO",
        project_id: project.id,
        created_by: users[0].id,
      });

      const response = await authRequest.get(
        `/todos/${newTodo.id}/assignments`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("DELETE /:id/assignments", () => {
    beforeEach(async () => {
      // Create some assignments
      await knex("todo_assignment").insert([
        { todo_id: todo.id, user_id: users[0].id },
        { todo_id: todo.id, user_id: users[1].id },
      ]);
    });

    it("should delete specified assignments for a todo", async () => {
      const deleteData = {
        user_ids: [users[0].id],
      };

      const response = await authRequest.delete(
        `/todos/${todo.id}/assignments`,
        deleteData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Assignments deleted successfully"
      );

      // Verify only the specified assignment was deleted
      const remainingAssignments = await knex("todo_assignment").where({
        todo_id: todo.id,
      });
      expect(remainingAssignments).toHaveLength(1);
      expect(remainingAssignments[0]).toHaveProperty("user_id", users[1].id);
    });

    it("should delete all assignments if all user_ids are specified", async () => {
      const deleteData = {
        user_ids: [users[0].id, users[1].id],
      };

      const response = await authRequest.delete(
        `/todos/${todo.id}/assignments`,
        deleteData
      );

      expect(response.status).toBe(200);

      // Verify all assignments were deleted
      const remainingAssignments = await knex("todo_assignment").where({
        todo_id: todo.id,
      });
      expect(remainingAssignments).toHaveLength(0);
    });

    it("should return 400 if user_ids is not an array", async () => {
      const invalidData = {
        user_ids: "not-an-array",
      };

      const response = await authRequest.delete(
        `/todos/${todo.id}/assignments`,
        invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should not error if trying to delete non-existent assignments", async () => {
      const nonExistentData = {
        user_ids: [999999], // Non-existent user ID
      };

      const response = await authRequest.delete(
        `/todos/${todo.id}/assignments`,
        nonExistentData
      );

      expect(response.status).toBe(200);

      // Verify original assignments still exist
      const remainingAssignments = await knex("todo_assignment").where({
        todo_id: todo.id,
      });
      expect(remainingAssignments).toHaveLength(2);
    });
  });

  describe("GET /:id/comments", () => {
    let comments;

    beforeEach(async () => {
      // Create some test comments
      comments = await knex("comments")
        .insert([
          {
            content: "First test comment",
            todo_id: todo.id,
            created_by: users[0].id,
          },
          {
            content: "Second test comment",
            todo_id: todo.id,
            created_by: users[1].id,
          },
        ])
        .returning("*");
    });

    it("should get comments for a particular todo", async () => {
      const response = await authRequest.get(`/todos/${todo.id}/comments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Check that the comments have the expected properties
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("content");
    });

    it("should return an empty array if no comments exist for the todo", async () => {
      // Create a new todo without comments
      const newTodo = await createTodo({
        title: "Todo without comments",
        description: "A todo with no comments",
        status: "TODO",
        project_id: project.id,
        created_by: users[0].id,
      });

      const response = await authRequest.get(`/todos/${newTodo.id}/comments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("POST /:id/comments", () => {
    it("should add a comment to a todo", async () => {
      const commentData = {
        content: "New test comment",
      };

      const response = await authRequest.post(
        `/todos/${todo.id}/comments`,
        commentData
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content", commentData.content);

      // Verify the comment was created in the database
      const comment = await knex("comments")
        .where({ id: response.body.id })
        .first();
      expect(comment).toBeTruthy();
      expect(comment.content).toBe(commentData.content);
      expect(comment.todo_id).toBe(todo.id);
    });

    it("should return 400 if content is missing", async () => {
      const commentData = {};

      const response = await authRequest.post(
        `/todos/${todo.id}/comments`,
        commentData
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
