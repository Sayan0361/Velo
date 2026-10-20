import { Router } from "express";
import {
        syncAuth0User,
        registerUser,
        logoutUser,
        loginUser,
        completeProfile
} from "../controllers/user.controller.ts";
import { verifyJWT } from "../middleware/auth.middleware.ts";

const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

/**
 * This route is only required when the user is registered with providerType = auth0
 * We save the user data in our mongodb with this route
 * With /auth0-sync route, we sync the user with our system
 * With /complete-profile route, we add the user to mongodb
 * 
Frontend (Auth0 login)
        ↓
verifyJWT (who are you?)
        ↓
syncAuth0User (do I know you?)
        ↓
completeProfile (finish setup)
        ↓
normal app usage
 */
userRouter.post("/auth0-sync", verifyJWT, syncAuth0User);

userRouter.post("/complete-profile", verifyJWT, completeProfile);

userRouter.post("/logout", verifyJWT, logoutUser);

userRouter.get("/profile", verifyJWT, (req: any, res) => {
        if (!req.user) {
                return res.status(404).json({ message: "User not onboarded" });
        }
        res.json(req.user);
});

export default userRouter;