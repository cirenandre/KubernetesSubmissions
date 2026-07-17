const WIKIPEDIA_RANDOM_URL = process.env.WIKIPEDIA_RANDOM_URL || 'https://en.wikipedia.org/wiki/Special:Random';
const TODO_BACKEND_URL = process.env.TODO_BACKEND_URL || 'http://todo-backend-svc:3000/todos';

async function getRandomArticleUrl() {
  const response = await fetch(WIKIPEDIA_RANDOM_URL, { redirect: 'manual' });
  let location = response.headers.get('location');

  if (!location) {
    throw new Error('No Location header in Wikipedia response');
  }

  if (location.startsWith('//')) {
    location = `https:${location}`;
  }

  return location;
}

async function createTodo(text) {
  const params = new URLSearchParams({ todo: text });
  const response = await fetch(TODO_BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'manual',
  });

  if (response.status !== 303) {
    throw new Error(`Failed to create todo, got status ${response.status}`);
  }
}

async function main() {
  const url = await getRandomArticleUrl();
  const text = `Read ${url}`;
  console.log(`Creating todo: ${text}`);
  await createTodo(text);
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
