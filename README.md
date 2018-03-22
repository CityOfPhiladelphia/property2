# Property

[![Tested on BrowserStack](https://img.shields.io/badge/browserstack-tested-brightgreen.svg?logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAACsUlEQVQokVWSTWwUZQCGn2%2B%2Bnd2d7XS7K1v6Q6WAaBoKklAMP0rcNBqWiMET0SskxEBAURLjBfZkPJAQWmOswkVjYnqiKiGALQ0NP0EIcjAg0gottNB26f7Odmfmm89TG31P7%2BF5bo%2FgP%2BvX%2FfKto31bmY3vV2O590VJIlKps5FS0Fv35roRkc06C6xYOLkvt3cyWTmh7wdve402411Jys0GNkWSUxXij%2Bw79S1N2brPTp9ZFJ9lM6%2FKfP5c%2BK7ZOvpGmsHMu9wImnjmgUWeDeavpNUQa25ZKpVq%2FST6wbc9QvccjExP3LhkPdJbxpdnOL%2FnEAMPKzy48gve%2BH2q7Wuo37Sdd2Kn2BW7wusPG%2F1k%2B4sZIzd9d1tYqS3lis2Tne8xWoHJn05g9h1jxa2LfLfKRI4McNPdyG03zMyyaqhWLB41dCT2EZ7Ci8bxUimCuVn0zUuIcBSzPs7fo2OI4Z%2BpuYrn8yEeWwGE1CaD%2BWLaB5Rw8P0SrzTGCSdSaOUz%2BWSSvq96cRNLWW1X0TrAV2CGRMQILWseMySYco78P0O8tDTB7sOf09KxFqvOZslrabr37aVD%2Fo4hBY1ljVCCkGyI9UgrciqWcGm6eoY%2F2iKs27iDzm9%2BoJzP4cZqTJcHmCg9oEv6rJyL4b0gnFD91uVn8zNTszhPU13FAoULP3K9awRpNwOK0swEQVBhveuTGXdJdLRRM4zLAsD5bd%2Bn8t7E8cJfTzF8eNwQ5l6zScmSWAhWFmq8XDVIrm9HJ%2BuqfhDtFgBa98va8OBJOZU74IxO4z93EF4AhsCImpitDcQ6W1ARs%2Br55odW99ffLyaH1sK99vEeUXOOaGe%2BQypFIDQh28IThhJCXvZ1%2BJiV7h35X6uL%2Fp9Z2y8WNiOj25BWp67NDaOMa18MHr%2BdzYpggfsXmkch023E8JUAAAAASUVORK5CYII%3D)](https://www.browserstack.com/)

Property is a client-side web application for aggregating open data about properties in the City of Philadelphia. All logic is in client-side JavaScript -- there is not server-side components outside of the open data APIs.

Property makes several AJAX calls, some of which are required to complete before the next one can happen. The flow happens like this:

1. Geocode user input expecting zero or more property results. These results include a summary of OPA and standardized address data.
2. With the OPA number, fetch the OPA details for a single property.
3. At the same time, use the Standardized Address to fetch the service area data from Socrata.

But a user can also share a link directly to a property which contains the OPA number in the query string. In this case, the flow happens like this:

1. With the OPA number, fetch the OPA details for a single property.
2. After the details have been fetched, then use the Standardize address to fetch the service area data from Socrata.

## Local Setup

Clone the repository
```
git clone git@github.com:CityOfPhiladelphia/property2.git
cd property2
```

Start a web server of your choosing. For example:
```
python -m SimpleHTTPServer
```

You're done! Go visit [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Contributing

### Markup

Nearly all markup is in templates located in `index.html`, but note that some is generated in the JavaScript views.

### Application

All application setup logic is in `js/app.js`. This includes event bindings, templating, utilities, etc.

### Views

`js/front.js`
- for the landing page.

`js/results.js`
- for displaying zero or more than 1 results as a table.

`js/property.js`
- for showing all of the details for a single property.

## Deploying

Property is hosted on GitHub pages. To deploy:

1. Push a new feature branch to GitHub.
2. Create a Pull Request from your feature branch to the `gh-pages` branch.
3. Merge the Pull Request.
4. Done!

## Supported Browsers

Test against each of these browsers, including mobile and print view, before deploying to production.

- IE9 and up
- Latest version of all other browsers
