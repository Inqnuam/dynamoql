import { Conversation } from "../../models/conversations";

const conversation = {
  members: ["some-member-id-1", "some-member-id-2"],
  messages: [
    {
      from: "some-member-id-2",
      text: "Here is my favorite song",
      attachments: [
        {
          multipart: false,
          name: "Michael Jackson - Billie Jean",
          type: "audio",
          content: Buffer.from("audio:mp3"),

          stored: {
            bucket: "my-storage-bucket",
            size: 42812,
          },
        },
      ],
    },
  ],
} satisfies Conversation;

conversation.messages[0].attachments[0].stored.size;

type StoredType = Conversation["messages"][number]["attachments"][number]["stored"];

const isStored: StoredType = false;
const storedBucket: StoredType = {
  bucket: "some-bucket",
  size: 3,
};

const aa = {
  bucket: "my-storage-bucket",
  size: 42812,
};

conversation.messages[0].attachments[0].stored = aa;

conversation.messages[0].attachments[0].stored.size = 3;
conversation.messages[0].attachments[0].stored.bucket = "new-bucket-name";

// @ts-expect-error
conversation.messages[0].attachments[0].stored.bucket = 5354;

interface Attachment {
  id?: string;
  name: string;
  type: "audio" | "video" | "image" | "calendar";
  content: Buffer;
  stored: boolean | { bucket: string; size: number };
  downloadedBy?: Set<string>;
  partId: string;
  multipart: boolean;
}

interface Message {
  id?: string;
  from: string;
  receivedBy: null | string[];
  text: string;
  attachments: Attachment[];
}

interface IConversation extends Conversation {
  id?: string;
  active?: true;
  members: string[];
  messages: Message[];
}
