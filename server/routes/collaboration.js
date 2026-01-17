const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const collaborationController = require('../controllers/collaborationController');

// Generate share link for a project
router.use(authMiddleware.verifyToken);
router.post('/:projectId/share',  collaborationController.generateShareLink);

// Get project info from share token (for preview before joining)
router.get('/project/:shareToken',  collaborationController.getProjectByToken);

// Join a project as collaborator
router.post('/join',  collaborationController.joinProject);

// Get projects I've joined as collaborator
router.get('/projects',  collaborationController.getCollaboratedProjects);

// Pull files from a project (for initial clone or sync)
router.get('/:projectId/pull',  collaborationController.pullProject);

module.exports = router;