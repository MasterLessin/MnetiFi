import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Send, User, Headphones, Search } from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage, WifiUser } from "@shared/schema";

interface UnreadChat {
  wifiUserId: string;
  wifiUserName: string;
  wifiUserPhone: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
}

export default function ChatPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const { data: unreadChats, isLoading: loadingUnread } = useQuery<UnreadChat[]>({
    queryKey: ["/api/chat-unread"],
  });

  const { data: wifiUsers, isLoading: loadingUsers } = useQuery<WifiUser[]>({
    queryKey: ["/api/wifi-users"],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", selectedUser],
    enabled: !!selectedUser,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/chat/${selectedUser}`, { message });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedUser] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-unread"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;
    sendMessageMutation.mutate(newMessage);
  };

  const filteredUsers = wifiUsers?.filter(user => 
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phoneNumber?.includes(searchQuery)
  ) || [];

  const getUnreadCount = (userId: string) => {
    return unreadChats?.find(c => c.wifiUserId === userId)?.unreadCount || 0;
  };

  const selectedUserData = wifiUsers?.find(u => u.id === selectedUser);

  return (
    <div className="flex h-full gap-4 p-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-chat"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {loadingUsers || loadingUnread ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredUsers.map((user) => {
                  const unreadCount = getUnreadCount(user.id);
                  const isSelected = selectedUser === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      className={`w-full p-3 rounded-md text-left transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover-elevate"
                      }`}
                      data-testid={`chat-user-${user.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm">
                              {user.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.phoneNumber}
                            </p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <Badge variant="default" className="flex-shrink-0">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No customers found
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {selectedUserData?.fullName || "Customer"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedUserData?.phoneNumber}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-3/4" />
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromCustomer ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.isFromCustomer
                              ? "bg-muted"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {msg.isFromCustomer ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <Headphones className="h-3 w-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {msg.isFromCustomer ? "Customer" : "Support"}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-50 mt-1">
                            {msg.createdAt && format(new Date(msg.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start a conversation with this customer</p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Select a conversation</h3>
            <p className="text-sm">Choose a customer from the list to view messages</p>
          </div>
        )}
      </Card>
    </div>
  );
}
