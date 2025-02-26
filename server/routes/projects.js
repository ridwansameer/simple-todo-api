const ProjectRouter = require("express").Router();
const z = require("zod");
const knex = require("../database/connection.js");
const { isUserInOrganisationOfProject } = require("../utils/organisations.js");

ProjectRouter.post("/:id/todos", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { user } = req;
    const { title, description, due_date, status } = createTodoSchema.parse(
      req.body
    );

    const isUserInOrganisation = await isUserInOrganisationOfProject(
      projectId,
      user.id
    );
    if (!isUserInOrganisation) {
      return res
        .status(403)
        .json({ error: "User is not in the organisation of the project" });
    }

    const todo = await knex("todos")
      .insert({
        title,
        description,
        due_date,
        status,
        project_id: projectId,
        created_by: user.id,
      })
      .returning("*");

    res.status(201).json(todo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

ProjectRouter.get("/:id/todos", async (req, res) => {
  const { id: projectId } = req.params;
  const todos = await knex("todos").where({ project_id: projectId });
  res.status(200).json(todos);
});

const createTodoSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  due_date: z.string().optional(),
  status: z.enum(["TODO", "DOING", "DONE"]).optional(),
});

module.exports = ProjectRouter;
