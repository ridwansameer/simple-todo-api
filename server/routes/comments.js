const CommentRouter = require("express").Router();
const z = require("zod");
const knex = require("../database/connection.js");

CommentRouter.patch("/:id", async (req, res) => {
  const { id: commentId } = req.params;
  const comment = await knex("comments").where({ id: commentId }).first();
  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }
  if (comment.created_by !== req.user.id) {
    return res
      .status(403)
      .json({ error: "You are not allowed to update this comment" });
  }
  const { content } = updateCommentSchema.parse(req.body);
  await knex("comments").where({ id: commentId }).update({ content });
  res.status(200).json({ message: "Comment updated successfully" });
});

CommentRouter.delete("/:id", async (req, res) => {
  const { id: commentId } = req.params;
  const comment = await knex("comments").where({ id: commentId }).first();
  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }
  if (comment.created_by !== req.user.id) {
    return res
      .status(403)
      .json({ error: "You are not allowed to delete this comment" });
  }
  await knex("comments").where({ id: commentId }).delete();
  res.status(200).json({ message: "Comment deleted successfully" });
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

module.exports = CommentRouter;
