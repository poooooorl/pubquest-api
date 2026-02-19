interface PartyConfig {
  name: string;
  leaderUsername: string;
  memberUsernames: string[];
}

export const defaultParties: PartyConfig[] = [
  {
    name: "Bum Squad",
    leaderUsername: "paul",
    memberUsernames: ["alice", "bob", "charlie"],
  },
  {
    name: "London Crawlers",
    leaderUsername: "diana",
    memberUsernames: ["emma", "frank", "grace"],
  },
  {
    name: "Pub Masters",
    leaderUsername: "henry",
    memberUsernames: ["ivy", "jack", "kate"],
  },
  {
    name: "Night Hawks",
    leaderUsername: "leo",
    memberUsernames: ["mia", "noah"],
  },
];

export async function seedParties(client: any, users: any[]) {
  const createdParties: any[] = [];

  for (const partyConfig of defaultParties) {
    const leader = users.find((u) => u.username === partyConfig.leaderUsername);
    if (!leader) continue;

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const partyRes = await client.query(
      `INSERT INTO parties (name, leader_id, invite_code)
       VALUES ($1, $2, $3)
       RETURNING id, name, leader_id, invite_code`,
      [partyConfig.name, leader.id, inviteCode],
    );

    // Add leader as member
    await client.query(
      `INSERT INTO party_members (party_id, user_id)
       VALUES ($1, $2)`,
      [partyRes.rows[0].id, leader.id],
    );

    createdParties.push({ ...partyRes.rows[0], leader });

    // Add other members
    for (const username of partyConfig.memberUsernames) {
      const user = users.find((u) => u.username === username);
      if (user) {
        await client.query(
          `INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)`,
          [partyRes.rows[0].id, user.id],
        );
      }
    }
  }

  console.log(`✅ Created Parties: ${createdParties.length} with members`);
  return createdParties;
}

// Seed party invites
export async function seedPartyInvites(
  client: any,
  users: any[],
  parties: any[],
) {
  let inviteCount = 0;

  // Paul's party (Bum Squad)
  const paul = users.find((u) => u.username === "paul");
  const bumSquad = parties.find((p) => p.name === "Bum Squad");

  if (paul && bumSquad) {
    // Paul sends invites to some users
    const inviteesToPaul = ["dave", "grace", "henry"];
    for (const username of inviteesToPaul) {
      const user = users.find((u) => u.username === username);
      if (user) {
        await client.query(
          `INSERT INTO party_invites (party_id, inviter_id, invitee_id, status)
           VALUES ($1, $2, $3, 'PENDING')`,
          [bumSquad.id, paul.id, user.id],
        );
        inviteCount++;
      }
    }
  }

  // Other users send invites to Paul
  const londonCrawlers = parties.find((p) => p.name === "London Crawlers");
  const pubMasters = parties.find((p) => p.name === "Pub Masters");

  if (paul && londonCrawlers) {
    const diana = users.find((u) => u.username === "diana");
    if (diana) {
      await client.query(
        `INSERT INTO party_invites (party_id, inviter_id, invitee_id, status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [londonCrawlers.id, diana.id, paul.id],
      );
      inviteCount++;
    }
  }

  if (paul && pubMasters) {
    const henry = users.find((u) => u.username === "henry");
    if (henry) {
      await client.query(
        `INSERT INTO party_invites (party_id, inviter_id, invitee_id, status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [pubMasters.id, henry.id, paul.id],
      );
      inviteCount++;
    }
  }

  console.log(`✅ Created Party Invites: ${inviteCount} pending`);
}
