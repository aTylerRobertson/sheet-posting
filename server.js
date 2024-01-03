/* ::: ~~~ welcome to sheet-posting ~~~ ::: */
/* ::: a blogging "platform" powered by Google Sheets ::: */
/* ::: made by Tyler Robertson: https://www.aTylerRobertson.com ::: */


/* ::: Did you remix this project for your own blog? Look for the 🍕 emoji in the notes! ::: */

const path = require("path");

/* ::: 🍕 Make sure this matches your domain name! ::: */
const domain = 'https://sheet-posting.glitch.me';

/*::: 🍕 Remixing this for yourself? Replace this value with your spreadsheet's URL! ::: */
const indexSheet = "https://docs.google.com/spreadsheets/d/1kQRnpzbEC9YJFZ63gJgvdo8ZSF5j-4jgfuBGm1hHKF8/edit?usp=sharing";

/* ::: Require the fastify framework and instantiate it ::: */
const fastify = require("fastify")({
  /* ::: Set this to true for detailed logging ::: */
  logger: false
});

/* ::: Blog-related functions ::: */
const blog = require("./blog.js");

/* ::: Setup our static files ::: */
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

/* ::: fastify/formbody lets us parse incoming forms ::: */
fastify.register(require("@fastify/formbody"));

/* ::: Handlebars is our templating engine ::: */
const Handlebars = require("handlebars");

/* ::: point-of-view is a templating manager for fastify ::: */
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: Handlebars
  }
});

/* ::: Handle form submissions on the index page,
       where users can paste their spreadsheet URL to get started ::: */
/* ::: 🍕 If you're only using this for your own blog, you can remove this function ::: */ 
fastify.post("/", async (request, reply) => {
  const url = request.body.url;
  var id = url.match(/\/d\/(.*)\//)[1];
  /* ::: Check for invalid ID values ::: */
  /* ::: TO-DO: find a way to shorten ID values ::: */
  id = id.length > 30 ? '~' + id : '';
  /* ::: Once we have the ID from the spreadsheet, pass it over to the next route ::: */
  reply.redirect(`/${id}`);
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
    url: `${domain}/~${id}`,
    filter,
    seo,
    css,
    posts
  });
});

/* ::: Get the RSS feed for a blog ::: */
/* ::: 🍕 If you're only getting your own RSS, remove "/~:id" and "/~${id}" from this function ::: */
fastify.get("/~:id/rss", async (request, reply) => {
  const id = request.params.id; // 🍕 indexSheet.match(/\/d\/(.*)\//)[1];
  const seo = await blog.getSEO(id);
  const posts = await blog.getAllPosts(id);
  reply.headers({
    'content-type': 'application/xml'
  });
  reply.view("/src/pages/rss.hbs", {
    url: `${domain}/~${id}`,
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
      url: `${domain}/~${id}`,
      post: post,
      seo: seo,
      css: css
    });
  } else {
    reply.redirect(`/~${id}`);
  }
});

/* ::: Direct folks to the index page by default ::: */
fastify.get("/", async (request, reply) => {
  reply.view("/src/pages/index.hbs");
  /* ::: 🍕 If you want the index to be your blog instead of a static page,
            remove the line above, and un-comment the lines below! ::: */
  /*
  const id = indexSheet.match(/\/d\/(.*)\//)[1];
  const seo = await blog.getSEO(id);
  const css = await blog.getCSS(id);
  const posts = await blog.getAllPosts(id);
  reply.view("/src/pages/blog.hbs", {
    url: `${domain}`,
    seo: seo,
    css: css,
    posts: posts
  });
  reply.view("/src/pages/blog.hbs", {
    seo: seo
  });
  */
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
