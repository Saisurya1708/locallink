import { Router } from 'express';
import { authRouter } from './auth';
import { requestsRouter } from './requests';
import { chatRouter } from './chat';
import { ratingsRouter } from './ratings';
import { profileRouter } from './profile';

const router = Router();

router.use('/auth', authRouter);
router.use('/requests', requestsRouter);
router.use('/chat', chatRouter);
router.use('/ratings', ratingsRouter);
router.use('/profile', profileRouter);

export { router };
