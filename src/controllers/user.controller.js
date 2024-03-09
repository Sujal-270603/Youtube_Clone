import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user_model.js"
import { uploadOnCLoudinary } from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        //console.log(process.env.ACCESS_TOKEN_SECRET);

        const accessToken = user.generateAccessToken();
        // console.log(process.env.ACCESS_TOKEN_SECRET);
        const refreshToken = user.generateRefreshToken();
        

        user.refreshToken = refreshToken;
        await user.save({ validationBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, username, email, password } = req.body;
    console.log("email", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    console.log(req.files);
    
    const avatarLocalPath = await req.files?.avatar[0]?.path;
    //const coverImageLocalPath = await req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = await req.files?.coverImage[0]?.path
    }

    console.log(avatarLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath);
    const coverImage = await uploadOnCLoudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Inernal Server Error Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const userExist = await User.findOne({
        $or: [{username}, {email}]
    })
    
    if (!userExist) {
        throw new ApiError(400, "User does not Exist please sign up");
    }
    
    const correctPassword = await  userExist.isPasswordCorrect(password);

    if (!correctPassword) {
        throw new ApiError(400, "Wrong Password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(userExist._id);
    
    const loggedInUser = await User.findById(userExist._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user Logged Out"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const token = await req.cookie?.refreshToken || req.body.refreshToken;
    
        if (!token) {
            throw new ApiError(401, "Unauthorized Access");
        }
    
        const decodedToken = await jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
        if (!user) {
            throw new ApiError(400, "Invalid refresh token");
        }
    
        if (token != user.refreshToken) {
            throw new ApiError(400, "Refresh token expired or used");
        }
        
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = generateAccessAndRefreshTokens(user._id);
    
        res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token updated")
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
    
})

export { registerUser, loginUser, logOutUser, refreshAccessToken };