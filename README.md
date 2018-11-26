# lisp-notiz
Testing calculate methods on certain products.

-Imports data and schema via Ajax on init.
-Pretend sorting and so called `special`-title by schema (anlageangebote_liste.json)
-Builds template line by line:
    -Build properties and save lines by sort number
    -Append as one to DOM and remove loader
    -Provide Tages-/Flexgeld-Button with switch functionality
-Initialize tooltip on Country-field
-Set filter according to available runtimes
-Initialize calculation method with default values
-Provide function to blacklist BICs (notToPromote); these brands won't be displayed

Repository: https://github.com/Arne1974/lisp-notiz


## Instruction
`npm start` - This will install http-server and open `localhost:3030` in your default browser. 

If npx (npm 5.2+) won't work correctly, do the following steps:
1. Install a lightweight http-server: `npm install http-server -g`
2. Start server in default browser: `http-server ./ -p 3030 -o`