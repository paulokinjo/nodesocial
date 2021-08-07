const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

router.post('/api/1.0/users', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).send({
      validationErrors: {
        username: `Username cannot be ${username}`,
      },
    });
  }

  await UserService.save(req.body);
  return res.status(200).send({ message: 'User created' });
});

module.exports = router;
