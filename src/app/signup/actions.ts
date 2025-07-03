"use server";

import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { z } from "zod";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serializeMongoDocument } from '@/lib/utils';

const SignupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function signupAction(credentials: z.infer<typeof SignupSchema>) {
    await connectDB();
    const validatedFields = SignupSchema.safeParse(credentials);
    if(!validatedFields.success) {
        return { error: validatedFields.error.errors.map(e => e.message).join(" ") };
    }

    const { name, email, password } = validatedFields.data;

    try {
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { error: "User with this email already exists." };
        }

        // Check if this is the first user. If so, make them an admin.
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            image: `https://placehold.co/100x100.png`,
            role,
        });
        await user.save();

        // Create JWT
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        return { success: "User created successfully.", token, user: serializeMongoDocument({ id: user._id.toString(), name: user.name, email: user.email, image: user.image, role: user.role }) };
    } catch (error: any) {
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (error.message) {
            errorMessage = error.message;
        }
        return { error: errorMessage };
    }
}

export async function loginAction({ email, password }: { email: string; password: string }) {
    await connectDB();
    try {
        console.log('Login attempt for email:', email);
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found for email:', email);
            return { error: 'Invalid email or password.' };
        }
        console.log('User found:', user.email, 'Role:', user.role);
        
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('Password does not match for user:', email);
            return { error: 'Invalid email or password.' };
        }
        
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );
        
        console.log('Login successful for user:', email);
        return { 
            success: 'Login successful.', 
            token, 
            user: serializeMongoDocument({ 
                id: user._id.toString(), 
                name: user.name, 
                email: user.email, 
                image: user.image, 
                role: user.role 
            }) 
        };
    } catch (error: any) {
        console.error('Login error:', error);
        return { error: error.message || 'An error occurred during login.' };
    }
}
