// routes/projects.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware.verifyToken);

// Create new project with file upload
router.post('/create', projectController.createProjectRepo);

// Get all user projects
router.get('/', projectController.getUserProjects);

// Mark project as having changes
router.patch('/:projectId/changes', projectController.markProjectChanges);
//detect changes
router.post('/:projectId/detect-changes', projectController.detectFileChanges);
// Push changes to GitHub 
router.post('/:projectId/push', projectController.pushProjectChanges);


router.delete('/:projectId', projectController.deleteProject);
router.post('/:projectId/share', projectController.generateShareLink);
router.get('/share/:shareToken', projectController.getProjectByToken);
router.post('/join', projectController.joinProject);
router.get('/collaborated', projectController.getCollaboratedProjects);
// routes/projects.js - Add this route
router.get('/:projectId/clone', projectController.cloneProjectFiles);

module.exports = router;
