const app = require("./server-config.js");
const routes = require("./server-routes.js");
const TodoRouter = require("./routes/todos.js");
const ProjectRouter = require("./routes/projects.js");
const AuthRouter = require("./routes/auth.js");
const OrganisationRouter = require("./routes/organisations.js");
const CommentRouter = require("./routes/comments.js");
const { isLoggedInMiddleware } = require("./middleware/auth.js");
const port = process.env.PORT || 5000;

// app.get('/', routes.getAllTodos);
// app.get('/:id', routes.getTodo);

// app.post('/', routes.postTodo);
// app.patch('/:id', routes.patchTodo);

// app.delete('/', routes.deleteAllTodos);
// app.delete('/:id', routes.deleteTodo);

app.use("/todos", isLoggedInMiddleware, TodoRouter);
app.use("/projects", isLoggedInMiddleware, ProjectRouter);
app.use("/auth", AuthRouter);
app.use("/organisations", isLoggedInMiddleware, OrganisationRouter);
app.use("/comments", isLoggedInMiddleware, CommentRouter);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

module.exports = app;
