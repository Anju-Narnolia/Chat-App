'use server';



import type { User, Task } from '@/lib/types';
import connectDB from '@/lib/mongodb';
import UserModel from '@/lib/models/User';

export async function getUsers(): Promise<User[]> {
  try {
    await connectDB();
    const users = await UserModel.find({});
    
    return users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function getUserById(uid: string): Promise<User | null> {
  try {
    await connectDB();
    const user = await UserModel.findById(uid);
    if (!user) return null;
    
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role
    };
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsersByIds(uids: string[]): Promise<User[]> {
  try {
    await connectDB();
    const users = await UserModel.find({ _id: { $in: uids } });
    
    return users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role
    }));
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    await connectDB();
    const users = await UserModel.find({});
    
    return users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function getTasks(): Promise<Task[]> {
  try {
    await connectDB();
    const TaskModel = (await import('@/lib/models/Task')).default;
    const UserModel = (await import('@/lib/models/User')).default;
    
    const tasks = await TaskModel.find({}).sort({ createdAt: -1 });
    
    // Get all unique assignee IDs
    const assigneeIds = [...new Set(tasks.map(task => task.assigneeId).filter(Boolean))];
    const users = await UserModel.find({ _id: { $in: assigneeIds } });
    const userMap = new Map(users.map(user => [user._id.toString(), user]));
    
    return tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      status: task.status,
      label: task.label,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      assignee: task.assigneeId ? userMap.get(task.assigneeId) ? {
        id: userMap.get(task.assigneeId)!._id.toString(),
        name: userMap.get(task.assigneeId)!.name,
        email: userMap.get(task.assigneeId)!.email,
        image: userMap.get(task.assigneeId)!.image,
        role: userMap.get(task.assigneeId)!.role
      } : null : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}
