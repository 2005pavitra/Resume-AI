import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { logoutUser } from "./src/controllers/logoutController.js";

const JWT_SECRET = process.env.JWT_SECRET || "resume_ai_secret";

test("logoutUser allows an expired token to be treated as already logged out", async () => {
    const expiredToken = jwt.sign(
        { id: "123", jti: "abc-123" },
        JWT_SECRET,
        { expiresIn: -1 }
    );

    const req = {
        headers: {
            authorization: `Bearer ${expiredToken}`,
        },
    };

    const res = {
        statusCode: 0,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.payload = data;
            return this;
        },
    };

    await logoutUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.match(res.payload.message, /expired|logged out/i);
});
