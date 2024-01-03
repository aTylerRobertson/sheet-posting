const path = require("path");
const blog = require("./blog.js");
const Handlebars = require("handlebars");

const fastify = require("fastify")({
  logger: true
});

fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/"
});

fastify.register(require("@fastify/formbody"));
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: Handlebars
  }
});

/* ::: This helper creates unique links for post tags ::: */
Handlebars.registerHelper("getTags", function(url, options) {
  const tags = options.fn(this).split(',');
  let links = [];
  for (const tag of tags) {
    links.push(`<a href='${url}?tags=${tag.trim()}'>${tag.trim()}</a>`);
  }
  return links.join(', ');
});

/* ::: Get and display the blog corresponding to the ID provided ::: */
/* ::: 🍕 Remove this function if you're only going to be using this project for one blog! ::: */
fastify.get("/~:id", async (request, reply) => {
  const id = request.params.id;
  const seo = await blog.getSEO(id);
  const css = await blog.getCSS(id);
  let posts = await blog.getAllPosts(id);
  let filter;
  
  /* ::: Filter posts based on author or tag query ::: */
  if (request.query.author) {
    posts = posts.filter(post => post.author && post.author.toLowerCase() == request.query.author.toLowerCase())
    filter = `Showing all posts by <i>${request.query.author}</i>`;
  }
  if (request.query.tags) {
    for (const tag of request.query.tags.split(',')) {
      let check = new RegExp(tag.trim(), 'i');
      posts = posts.filter(post => post.tags && check.test(post.tags));
    }
    filter = `Showing all posts tagged <i>${request.query.tags}</i>`;
  }
  
  reply.view("/src/pages/blog.hbs", {
    url: `https://${process.env.DOMAIN}/~${id}`,
    filter,
    seo,
    css,
    posts
  });
});

/* ::: Get the RSS feed for a blog ::: */
/* ::: 🍕 If you're only getting your own RSS, remove "/~:id" and "/~${id}" from this function ::: */
fastify.get("/~:id/rss", async (request, reply) => {
  const id = request.params.id; // 🍕 process.env.DEFAULT.match(/\/d\/(.*)\//)[1];
  const seo = await blog.getSEO(id);
  const posts = await blog.getAllPosts(id);
  reply.headers({
    'content-type': 'application/xml'
  });
  reply.view("/src/pages/rss.hbs", {
    url: `https://${process.env.DOMAIN}/~${id}`,
    seo,
    posts
  });
});

/* ::: Get and display a specific post from a blog ::: */
/* ::: 🍕 If you're only using this for one blog, remove "~:id" and "~${id}" from this function ::: */
fastify.get("/~:id/:post", async (request, reply) => {
  const id = request.params.id;
  const post = await blog.getSinglePost(id, request.params.post);
  const seo = await blog.getSEO(id);
  const css = await blog.getCSS(id);
  if (post) {
    reply.view("/src/pages/post.hbs",{
      url: `https://${process.env.DOMAIN}/~${id}`,
      post: post,
      seo: seo,
      css: css
    });
  } else {
    reply.redirect(`/~${id}`);
  }
});

fastify.get("/", async (request, reply) => {
  // If we're using this for just one blog, render only that
  if (process.env.DEFAULT) {
    const id = process.env.DEFAULT.match(/\/d\/(.*)\//)[1];
    const seo = await blog.getSEO(id);
    const css = await blog.getCSS(id);
    const posts = await blog.getAllPosts(id);
    reply.view("/src/pages/blog.hbs", {
      url: `https://${process.env.DOMAIN}`,
      seo: seo,
      css: css,
      posts: posts
    });
  }

  // Otherwise, show the sheet-posting index page
  reply.view("/src/pages/index.hbs");
});

fastify.post("/", async (request, reply) => {
  const url = request.body.url;
  var id = url.match(/\/d\/(.*)\//)[1];
  id = id.length > 30 ? '~' + id : '';
  reply.redirect(`/${id}`);
});

/* ::: Run the server and report out to the logs ::: */
fastify.listen(process.env.PORT, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
