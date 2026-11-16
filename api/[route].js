// One deployed function serves the existing API URLs. Underscore files remain private helpers.
import analyze from "./_analyze.js";
import contribute from "./_contribute.js";
import contributions from "./_contributions.js";
import detect from "./_detect.js";
import models from "./_models.js";
import outline from "./_outline.js";
import ready from "./_ready.js";
import roads from "./_roads.js";
import scan from "./_scan.js";
import train from "./_train.js";
import training from "./_training.js";
import trainingImage from "./_training-image.js";
import uploadToken from "./_upload-token.js";

const routes = {
  "analyze": analyze,
  "contribute": contribute,
  "contributions": contributions,
  "detect": detect,
  "models": models,
  "outline": outline,
  "ready": ready,
  "roads": roads,
  "scan": scan,
  "train": train,
  "training": training,
  "training-image": trainingImage,
  "upload-token": uploadToken
};

export default function handler(req, res) {
  const name = new URL(req.url, "http://localhost").pathname.slice(5);
  const endpoint = Object.hasOwn(routes, name) && routes[name];
  if (!endpoint) return res.status(404).json({ error: "Not found." });
  return endpoint(req, res);
}
