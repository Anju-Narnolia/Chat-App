
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { getUsers } from "@/lib/firestore";
import type { User } from "@/lib/types";

export async function ContactList() {
  const users: User[] = await getUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Contacts</CardTitle>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="flex flex-col gap-4">
            {users.map((contact, index) => (
              <div key={contact.id} className="flex items-center gap-3 cursor-pointer hover:bg-secondary p-2 rounded-md transition-colors">
                <Avatar>
                  <AvatarImage src={contact.image} alt={contact.name ?? 'User avatar'} data-ai-hint="person avatar" />
                  <AvatarFallback>{contact.name?.charAt(0) ?? 'U'}</AvatarFallback>
                   {(index % 2 === 0) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                </Avatar>
                <span className="font-medium">{contact.name ?? 'Unnamed Contact'}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
