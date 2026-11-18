# giappichelli-downloader

download books from `reader.giappichelli.it`. how to use:

1. install dependencies with `bun install` (or your package manager of choice). tested with Bun 1.4.3.
2. run (`bun start` or equivalent).
3. log in to [reader.giappichelli.it](https://reader.giappichelli.it) with your credentials and open devtools. go to application > session storage > reader.giappichelli.it. select `oauth_tokens`: the value starts with `{"access_token":"(some access token here)",...`. copy the token's value and paste it as the Bearer.
4. open the book you want to download. the url ends in `.../read/(some id here)`. paste the id into the book id field.
5. wait a little while (you can see the pages being progressively downloaded into the `out` folder).
6. done!
