import express from 'express';
   const router = express.Router();

   /**
    * @swagger
    * /user:
    *   get:
    *     summary: Retrieve a list of users
    *     responses:
    *       200:
    *         description: A list of users
    */

   router.get('/user', (req, res, next) => {
       res.status(200).json([{ name: 'John Doe' }, { name: 'Jane Doe' }]);
   });

   export default router;