const challenges = {
  fragment: {
    requiredPrefix: "fr{",
    requiredSuffix: "}",
    answers: [
      "https://x.com/TheWatcher1242",
      "https://lazarusfragment.netlify.app",
      "/resurrection",
      "Rick",
      "@GreyArchive1242",
      "China",
      "AA127",
      "https://gitlab.com/greyarchive1/GreyArchive",
      "DFWPVG",
      "text",
      "https://what3words.com",
      "https://lazarusfragment.netlify.app/final",
      "Area 51"
    ]
  },
  extreme: {
    requiredPrefix: "hx{",
    requiredSuffix: "}",
    answers: [
      "April 13, 2023",
      "faN2wq!",
      "https://x.com/EnochHayes119",
      "Capybara",
      "https://ghost-of-hayes.netlify.app",
      "robots.txt",
      "https://ghost-of-hayes.netlify.app/watcher.",
      "anemoia",
      "Flag.gif",
      ".zip",
      "The mp3 speaks volumes, but not through your ears. You’ll need to change how you see it.",
      "Audio.mp3",
      "enoch.sec@proton.me",
      "ZeroSchema",
      "https://enochfiles.netlify.app/thereality",
      "archive.org",
      "curl -d \"auth=dev_AETHER.pem&target=Sentinel-9&mode=KINETIC\" https://site-blxk.onrender.com/uplink",
      "It's a weapon.",
      "119"
    ]
  },
  hard: {
    requiredPrefix: "pr{",
    requiredSuffix: "}",
    answers: [
      "taylorartx.wordpress.com",
      "no",
      "04/08/25",
      "taylorisgoodatart",
      "bridge.jpeg",
      "GitLab",
      "TaylorArtX",
      "art is the key",
      "37.7749° N, 122.4194° W",
      "IFZXI===",
      "TaylorPaints",
      "Vimeo",
      "04/08/25",
      "UAL",
      "UAL1517",
      "texas",
      "DFW",
      "My site /cipher",
      "@taylorartx",
      "bridge",
      "pastebin",
      "37.7833° N, 122.4167° W",
      "taylorpaints@proton.me"
    ]
  },
  medium: {
    requiredPrefix: "",
    requiredSuffix: "",
    answers: [
      "emmatruthseeker.wordpress.com",
      "The City's Secrets",
      "I often tweet about hidden truths",
      "cityscape.png",
      "40.7128° N, 74.0060° W",
      "hawaii",
      "VGhlIGtleSB0byBteSBzZWNyZXRzIGlzIGxpYmVydHk=",
      "Liberty Café",
      "The key is in the art",
      "liberty",
      "@EmmaTruthSeeker",
      "Wkh orfdwlrq lv klgghq",
      "40.7829° N, 73.9654° W",
      "Central Park",
      "ZW1tYXRydXRoc2Vla2VyQHByb3Rvbi5tZQ==",
      "emmatruthseeker@proton.me"
    ]
  },
  abyss: {
    requiredPrefix: "ab{",
    requiredSuffix: "}",
    answers: [
      "115",
      "https://acheronLeaks.netlify.app/curl",
      "sonar13.png",
      "https://x.com/AcheronL34241",
      "1acheronleaks1@gmail.com",
      "Elmo",
      "Try looking behind the covers of this image",
      "2",
      "You must view the audio- literally",
      "https://AcheronLeaks.netlify.app/connection",
      "Offline",
      "Sentinel-9",
      "Enoch Hayes"
    ]
  },
  rocky: {
    requiredPrefix: "",
    requiredSuffix: "",
    answers: [
      "galactnet",
      "666",
      "andyweirofficial",
      "2020-12-04-16-11",
      "binary",
      "operation polar hideout",
      "413966",
      "zip",
      "astrophage",
      "polarhideout.pages.dev",
      "893177",
      "-78.413966, -85.893177",
      "mount tyree"
    ]
  }
};

function normalize(str) {
  return str.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKC")
    .trim();
}

function reduceImportantPart(str) {
  const normalized = normalize(str)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@+/, "")
    .replace(/^\.+/, "");

  return normalized.replace(/[^a-z0-9]+/g, "");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const alternateAnswers = {
  rocky: {
    3: [
      "Friday, December 4, 2020 at 4:11 PM",
      "December 4, 2020 at 4:11 PM"
    ]
  }
};

function validateAnswer(challenge, questionIndex, answer) {
  const data = challenges[challenge];
  if (!data || typeof questionIndex !== "number" || typeof answer !== "string") {
    return { correct: false, error: "Invalid request format", challenge, questionIndex };
  }

  const expectedAnswer = data.answers?.[questionIndex];
  if (expectedAnswer === undefined) {
    return {
      correct: false,
      error: "Answer not found",
      debug: { challenge, questionIndex }
    };
  }

  const expectedReduced = reduceImportantPart(expectedAnswer);
  const givenReduced = reduceImportantPart(answer);
  const isTooShort = expectedReduced.length < 2 || givenReduced.length < 2;
  const alternates = alternateAnswers[challenge]?.[questionIndex] || [];
  const alternateMatch = alternates.some((alternate) => {
    const alternateReduced = reduceImportantPart(alternate);
    return alternateReduced.length >= 2 && givenReduced.includes(alternateReduced);
  });

  return {
    correct: !isTooShort && (givenReduced.includes(expectedReduced) || alternateMatch),
    given: normalize(answer),
    challenge,
    questionIndex
  };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/all") {
      try {
        const body = await request.json();
        const challenge = body.challenge;
        const data = challenges[challenge];
        if (!data) {
          return new Response(JSON.stringify({ error: "Invalid challenge name" }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const maskedAnswers = data.answers.map((ans) => "x".repeat(ans.length));

        return new Response(JSON.stringify({ answers: maskedAnswers }), {
          status: 200,
          headers: CORS_HEADERS
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid JSON body", detail: err.message }), {
          status: 400,
          headers: CORS_HEADERS
        });
      }
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: CORS_HEADERS
      });
    }

    try {
      const body = await request.json();
      let result;

      if (Array.isArray(body)) {
        result = body.map(({ challenge, questionIndex, answer }) =>
          validateAnswer(challenge, questionIndex, answer)
        );
      } else {
        const { challenge, questionIndex, answer } = body;
        result = validateAnswer(challenge, questionIndex, answer);
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: CORS_HEADERS
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal error", detail: err.message }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};
