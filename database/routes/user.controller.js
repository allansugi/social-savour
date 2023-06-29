
import { 
    createAddress, 
    createLogin, 
    createUse, 
    createNewPost, 
    createReviews,
    insertSubscribedTo, 
    getUsers,
    getUserByUserId, 
    getLoginByUsername, 
    createEateryAccount, 
    insertNewCuisineName, 
    insertCuisineFromRestaurant, 
    insertHourFromRestaurant, 
    getCuisineFromCuisineId,
    getPostByPostId, 
    getReviewByReviewId, 
    getEateryByRestaurantId
} from "./user.service.js";
import crypto from "crypto";
import pkg from "jsonwebtoken";
import 'dotenv/config';

const { sign } = pkg;

//used to store invalidated tokens once a user logs-out
export let tokenBlackList = [];

//Controller functions
//async functions are written function2

//create account in LoginInfo table
export async function createAccountInfo(req, res) {
    try {
        const body = req.body;
        body.password = getHashOf(body.password);
        const result = await createLogin(body);
        return res.status(200).json(result);
    } catch (error) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//create address in Address table
export async function createAddressInfo(req, res) {
    try {
        const body = req.body;
        const result = await createAddress(body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//create User in UserAccount table
export async function createUser(req, res) {
    try {
        const body = req.body;
        const result = await createUse(body);
        return res.status(200).json(result);
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function createUserReviews(req, res) {
    try {
        const body = req.body;
        const result = await createReviews(body);
        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function createEateryPosts(req, res) {
    try {
        const body = req.body
        const result = await createNewPost(body);
        return res.status(200).json(result); 
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function createSubscribedTo(req, res) {
    try {
        const body = req.body;
        const result = await insertSubscribedTo(body);
        return res.status(200).json(result);
    } catch (error) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//get user by userId
export async function getUserById(req, res) {
    try {
        const id = req.params.id;
        const result = await getUserByUserId(id);
        if (result.success == 0) { // user not found
            return res.status(404).json(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//get all existing users
export async function getAllUsers(req, res) {
    try {
        const results = await getUsers();
        return res.status(200).json(results);
    } catch (err) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//user obtains token here
export async function login(req, res) {
    try {
        const body = req.body;
        const results = await getLoginByUsername(body.login);
        
        if (results.success == 0) {
            return res.json(results);
        }
        //check if hashed password matches
        console.log(body.password);
        console.log(results.password);
        const result = getHashOf(body.password) === results.password;
        if (result) {
            results.password = undefined;
            const jsonwebtoken = sign({result: results}, process.env.SECRET, {expiresIn: "1h"});
            //provide user with a cookie containing A token
            res.cookie('token', jsonwebtoken,{
                secure: process.env.NODE_ENV !== "development",
                httpOnly: true,
            });
            //confirm success
            return res.status(200).json({
                success: 1,
                data: "Login successful"
            });
        } else {
            return res.json({
                success: 0,
                data: "Invalid username or password"
            });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export function logout(req, res) {
    const token = req.cookies.token;
    if (token) {
        tokenBlackList.push(token);
        return res.json({
            success: 1,
            message: "You've been logged-out!"
        });
    } else {
        return res.json({
            success:0,
            message: "Not logged-in!"
        });
    }
}

export async function createEatery(req,res) {
    try {
        const body = req.body;
        const result = await createEateryAccount(body);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({
            success: 0,
            message: "Database conenction error"
        });
    }
}

export async function createCuisine(req,res) {
    try {
        const body = req.body;
        const result = await insertNewCuisineName(body);
        if (result.success == 0) { //cuisine exist
            return res.status(409).json(result);
        }
        return res.status(200).json(result);

    } catch (err) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function getCuisineById(req, res) {
    try {
        const id = req.params.id
        const result = await getCuisineFromCuisineId(id);

        if (result.success == 0) {
            return res.status(404).json(result); 
        }
        return res.status(200).json(result);

    } catch (err) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function getPostById(req, res) {
    try {
        
        const id = req.params.id;
        console.log(id)
        const result = await getPostByPostId(id);

        if (result.success == 0) {
            return res.status(404).json(result);
        }
        return res.status(200).json(result);

    } catch (err) {
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function getReviewById(req, res) {
    try {
        const id = req.params.id;
        const result = await getReviewByReviewId(id);
        
        if (result.success == 0) {
            return res.status(404).json(result);
        }
        return res.status(200).json(result);

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

// insert the cuisines of what the restaurant offers
export async function createRestaurantCusine(req, res) {
    try {
        const body = req.body;
        const result = await insertCuisineFromRestaurant(body);
        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function createBusinessHour(req, res) {
    try {
        const body = req.body;
        const result = await insertHourFromRestaurant(body);
        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

export async function getEateryById(req, res) {
    try {
        const id = req.params.id;
        const result = await getEateryByRestaurantId(id);
        
        if (result.success == 0) {
            return res.status(404).json(result);
        }
        return res.status(200).json(result);

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: 0,
            message: "Database connection error"
        });
    }
}

//Used to hash the password for security
function getHashOf(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}