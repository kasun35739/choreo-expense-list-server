import express from "express";
import cache from "./cache.mjs";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// add a expense - request body should contain a title, status and an author
app.post("/expense-list/expenses", (req, res) => {
  const { title, author, status } = req.body;
  const uuid = uuidv4();
  if (!(status === "read" || status === "to_read" || status === "reading")) {
    return res.status(400).json({
      error: "Status is invalid. Accepted statuses: read | to_read | reading",
    });
  }
  if (!title || !author || !status) {
    return res.status(400).json({ error: "Title, Status or Author is empty" });
  }
  const value = { uuid, title, author, status };
  cache.set(uuid, value, 86400);
  return res.status(201).json({ uuid, title, author });
});

// update status of a expense by uuid
app.put("/expense-list/expenses/:uuid", (req, res) => {
  const uuid = req.params.uuid;
  const { status } = req.body;
  if (!uuid || typeof uuid !== "string") {
    return res.status(400).json({ error: "missing or invalid UUID" });
  }
  if (!cache.has(uuid)) {
    return res.status(404).json({ error: "UUID does not exist" });
  }
  if (!(status === "read" || status === "to_read" || status === "reading")) {
    return res.status(400).json({
      error: "Status is invalid. Accepted statuses: read | to_read | reading",
    });
  }
  const value = cache.get(uuid);
  value.status = status;
  cache.set(uuid, value);
  return res.json({ uuid, status });
});

// get the list of expenses
app.get("/expense-list/expenses", (_, res) => {
  const keys = cache.keys();
  const allData = {};
  for (const key of keys) {
    allData[key] = cache.get(key);
  }
  return res.json(allData);
});

// get a expense by uuid
app.get("/expense-list/expenses/:uuid", (req, res) => {
  const uuid = req.params.uuid;
  if (!uuid || typeof uuid !== "string") {
    return res.status(400).json({ error: "missing or invalid UUID" });
  }
  if (!cache.has(uuid)) {
    return res.status(404).json({ error: "UUID does not exist" });
  }
  const value = cache.get(uuid);
  return res.json(value);
});

// delete a expense by uuid
app.delete("/expense-list/expenses/:uuid", (req, res) => {
  const uuid = req.params.uuid;
  if (!uuid || typeof uuid !== "string") {
    return res.status(400).json({ error: "missing or invalid UUID" });
  }
  if (!cache.has(uuid)) {
    return res.status(404).json({ error: "UUID does not exist" });
  }
  cache.del(uuid);
  return res.json({ uuid });
});

// health check
app.get("/healthz", (_, res) => {
  return res.sendStatus(200);
});

app.use((err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  res.status(500);
  res.json({ error: err.message });
});

app.use("*", (_, res) => {
  return res
    .status(404)
    .json({ error: "the requested resource does not exist on this server" });
});

export default app;
