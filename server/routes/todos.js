const TodoRouter = require("express").Router();
const knex = require("../database/connection.js");
const z = require("zod");

TodoRouter.post("/:id/assignments", async (req, res) => {
  try {
    const { id: todoId } = req.params;
    const { user_ids } = createAssignmentSchema.parse(req.body);

    await knex.transaction(async (trx) => {
      for (const userId of user_ids) {
        await trx("todo_assignment").insert({
          user_id: userId,
          todo_id: todoId,
        });
      }
    });

    res.status(201).json({ message: "Assignments created successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

TodoRouter.get("/:id/assignments", async (req, res) => {
  try {
    const { id: todoId } = req.params;
    const assignments = await knex("todo_assignment").where({
      todo_id: todoId,
    });
    res.status(200).json(assignments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

TodoRouter.delete("/:id/assignments", async (req, res) => {
  try {
    const { id: todoId } = req.params;
    const { user_ids } = createAssignmentSchema.parse(req.body);
    await knex("todo_assignment")
      .where({ todo_id: todoId })
      .whereIn("user_id", user_ids)
      .delete();
    res.status(200).json({ message: "Assignments deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

TodoRouter.get("/:id/comments", async (req, res) => {
  const { id: todoId } = req.params;
  const comments = await knex("comments").where({ todo_id: todoId });
  res.status(200).json(comments);
});

TodoRouter.post("/:id/comments", async (req, res) => {
  try {
    const { id: todoId } = req.params;
    const { content } = createCommentSchema.parse(req.body);
    const comment = await knex("comments")
      .insert({
        content,
        todo_id: todoId,
        created_by: req.user.id,
      })
      .returning("*");
    res.status(201).json(comment[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const createCommentSchema = z.object({
  content: z.string().min(1),
});

const createAssignmentSchema = z.object({
  user_ids: z.array(z.number().int().positive()),
});

module.exports = TodoRouter;
