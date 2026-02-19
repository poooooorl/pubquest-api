interface FriendshipPair {
  user1: string;
  user2: string;
  status?: "ACCEPTED" | "PENDING";
}

export const defaultFriendships: FriendshipPair[] = [
  // Admin (paul) friends - accepted
  { user1: "paul", user2: "alice", status: "ACCEPTED" },
  { user1: "paul", user2: "bob", status: "ACCEPTED" },
  { user1: "paul", user2: "charlie", status: "ACCEPTED" },
  { user1: "paul", user2: "dave", status: "ACCEPTED" },
  { user1: "paul", user2: "grace", status: "ACCEPTED" },

  // Pending friend requests TO paul (paul is addressee)
  { user1: "emma", user2: "paul", status: "PENDING" },
  { user1: "frank", user2: "paul", status: "PENDING" },
  { user1: "henry", user2: "paul", status: "PENDING" },

  // User friendships
  { user1: "alice", user2: "bob", status: "ACCEPTED" },
  { user1: "alice", user2: "emma", status: "ACCEPTED" },
  { user1: "alice", user2: "jack", status: "ACCEPTED" },
  { user1: "charlie", user2: "diana", status: "ACCEPTED" },
  { user1: "charlie", user2: "frank", status: "ACCEPTED" },
  { user1: "diana", user2: "emma", status: "ACCEPTED" },
  { user1: "grace", user2: "henry", status: "ACCEPTED" },
  { user1: "grace", user2: "kate", status: "ACCEPTED" },
  { user1: "ivy", user2: "jack", status: "ACCEPTED" },
  { user1: "leo", user2: "mia", status: "ACCEPTED" },
  { user1: "noah", user2: "olivia", status: "ACCEPTED" },
  { user1: "peter", user2: "quinn", status: "ACCEPTED" },
  { user1: "ruby", user2: "sam", status: "ACCEPTED" },
];

export async function seedFriendships(client: any, users: any[]) {
  let acceptedCount = 0;
  let pendingCount = 0;

  for (const friendship of defaultFriendships) {
    const user1 = users.find((u) => u.username === friendship.user1);
    const user2 = users.find((u) => u.username === friendship.user2);

    if (user1 && user2) {
      const status = friendship.status || "ACCEPTED";
      await client.query(
        `INSERT INTO friendships (requester_id, addressee_id, status)
         VALUES ($1, $2, $3)`,
        [user1.id, user2.id, status],
      );

      if (status === "ACCEPTED") {
        acceptedCount++;
      } else {
        pendingCount++;
      }
    }
  }

  console.log(
    `✅ Created Friendships: ${acceptedCount} accepted, ${pendingCount} pending`,
  );
}
