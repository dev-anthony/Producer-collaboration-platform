
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController..js');
const authMiddleware = require('../middleware/authMiddleware.js');

router.post("/create", authMiddleware,projectController.createProjectRepo) 