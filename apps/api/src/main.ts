import express from "express";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.get("/", (_req, res) => res.send("API running"));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${PORT}`);
});
