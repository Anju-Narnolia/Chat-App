
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import { CreateUserDialog } from './create-user-dialog';
import { Card, CardContent } from '../ui/card';
import type { User } from '@/lib/types';

export function UserManagement({ users }: { users: User[] }) {
  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">User Management</h1>
            <p className="text-muted-foreground">
              Create, update, and manage your team members.
            </p>
          </div>
          <CreateUserDialog />
        </div>
        <Card className="flex-1 min-h-0">
          <CardContent className="h-full overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">User</TableHead>
                  <TableHead className="hidden md:table-cell p-4">Email</TableHead>
                  <TableHead className="p-4">Role</TableHead>
                  <TableHead className="p-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={user.image ?? ''}
                            alt={user.name ?? 'User avatar'}
                            data-ai-hint="person avatar"
                          />
                          <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name ?? 'Unnamed User'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.email ?? 'No email'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">User Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  )
}
