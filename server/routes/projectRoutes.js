
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');


router.use(authMiddleware.verifyToken);

router.post('/create', projectController.createProjectRepo);


router.get('/', projectController.getUserProjects);


router.get('/collaborated', projectController.getCollaboratedProjects);
router.get('/share/:shareToken', projectController.getProjectByToken);
router.post('/join', projectController.joinProject);


router.get('/:projectId', projectController.getProjectById);
router.get('/:projectId/clone', projectController.cloneProjectFiles);
router.get('/:projectId/check-remote-changes', projectController.checkRemoteChanges);
router.get('/:projectId/pull-changes', projectController.pullChanges);
router.patch('/:projectId/changes', projectController.markProjectChanges);

router.post('/:projectId/push', projectController.pushProjectChanges);

router.get('/:projectId/git-credentials', projectController.getGitCredentials);
router.post('/:projectId/record-push', projectController.recordPush);
router.get('/:projectId/pull-info', projectController.getPullInfo);

router.post('/:projectId/share', projectController.generateShareLink);
router.delete('/:projectId', projectController.deleteProject);

module.exports = router;
