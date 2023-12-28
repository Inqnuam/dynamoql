// @ts-check

const { Conversations } = require("./model-schema-jsdoc");

/**  @satisfies {import("./model-schema-jsdoc").Conversation} */

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
};

conversation.messages[0].attachments[0].stored.size;

const bucketInfo = {
  bucket: "my-storage-bucket",
  size: 42812,
};

conversation.messages[0].attachments[0].stored = bucketInfo;

conversation.messages[0].attachments[0].stored.size = 3;
conversation.messages[0].attachments[0].stored.bucket = "new-bucket-name";

// @ts-expect-error
conversation.messages[0].attachments[0].stored.bucket = 5354;

// @ts-expect-error
Conversations.put();

// @ts-expect-error
Conversations.put({});

Conversations.put({
  members: [],
  // @ts-expect-error
  active: "",
});

Conversations.put({
  members: [],
  active: true,
});

Conversations.put({
  // @ts-expect-error
  members: [5],
});

Conversations.put({
  members: ["member-1"],
});
