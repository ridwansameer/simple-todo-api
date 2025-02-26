process.env.NODE_ENV = "test";
const request = require("./util/httpRequests.js");
const {
  clearDatabase,
  createUser,
  createOrganisation,
  addUserToOrganisation,
  createProject,
  createTodo,
  createAuthenticatedRequests,
} = require("./util/testHelpers.js");
const knex = require("../database/connection.js");

describe("Comments API", () => {
  let user, organisation, project, todo, authToken, authRequest, comments;

  beforeEach(async () => {
    await clearDatabase();

    // Create a test user
    const userData = {
      email: "comment-test@example.com",
      name: "Comment Test User",
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

    // Create a todo
    todo = await createTodo({
      title: "Test Todo",
      description: "A test todo",
      status: "TODO",
      project_id: project.id,
      created_by: user.id,
    });

    // Create some test comments
    comments = await knex("comments")
      .insert([
        {
          content: "First test comment",
          todo_id: todo.id,
          created_by: user.id,
        },
        {
          content: "Second test comment",
          todo_id: todo.id,
          created_by: user.id,
        },
      ])
      .returning("*");
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  describe("PATCH /comments/:id", () => {
    it("should edit the content of a comment", async () => {
      const updateData = {
        content: "Updated comment content",
      };

      const response = await authRequest.patch(
        `/comments/${comments[0].id}`,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Comment updated successfully"
      );

      // Verify the comment was updated in the database
      const comment = await knex("comments")
        .where({ id: comments[0].id })
        .first();
      expect(comment).toBeTruthy();
      expect(comment.content).toBe(updateData.content);
    });

    it("should return 404 if comment does not exist", async () => {
      const updateData = {
        content: "Updated comment content",
      };

      const response = await authRequest.patch("/comments/9999", updateData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 if user is not the author of the comment", async () => {
      // Create another user
      const userData2 = {
        email: "another-user@example.com",
        name: "Another User",
        password: "password123",
      };
      const userResponse2 = await createUser(userData2);
      const user2 = userResponse2.user;
      const authToken2 = userResponse2.token;
      const authRequest2 = createAuthenticatedRequests(authToken2);

      // Add the user to the organisation
      await addUserToOrganisation(user2.id, organisation.id, "USER");

      const updateData = {
        content: "Unauthorized update attempt",
      };

      const response = await authRequest2.patch(
        `/comments/${comments[0].id}`,
        updateData
      );

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /comments/:id", () => {
    it("should delete a comment", async () => {
      const response = await authRequest.delete(`/comments/${comments[0].id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Comment deleted successfully"
      );

      // Verify the comment was deleted from the database
      const comment = await knex("comments")
        .where({ id: comments[0].id })
        .first();
      expect(comment).toBeUndefined();
    });

    it("should return 404 if comment does not exist", async () => {
      const response = await authRequest.delete("/comments/9999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 if user is not the author of the comment", async () => {
      // Create another user
      const userData2 = {
        email: "another-user2@example.com",
        name: "Another User 2",
        password: "password123",
      };
      const userResponse2 = await createUser(userData2);
      const user2 = userResponse2.user;
      const authToken2 = userResponse2.token;
      const authRequest2 = createAuthenticatedRequests(authToken2);

      // Add the user to the organisation
      await addUserToOrganisation(user2.id, organisation.id, "USER");

      const response = await authRequest2.delete(`/comments/${comments[0].id}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });
  });
});
