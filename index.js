const { create } = require('rung-sdk');
const { String, Natural, OneOf } = require('rung-sdk/dist/types');
const Bluebird = require('bluebird');
const agent = require('superagent');
const promisifyAgent = require('superagent-promise');
const { map, join, repeat, isNil } = require('ramda');

const request = promisifyAgent(agent, Bluebird);
const client_id = '!!!!!!!!!!!YOUR TOKEN HERE!!!!!!!!!!!'
const server = `https://api.airbnb.com/v2/search_results?client_id=${client_id}`;

function createAlert({ listing, pricing_quote }) {
    const {
        id,
        name,
        property_type,
        star_rating,
        person_capacity,
        public_address,
        bedrooms,
        beds,
        bathrooms,
        picture_urls
    } = listing;
    const { localized_currency, localized_nightly_price } = pricing_quote;
    const price = `${localized_currency} ${localized_nightly_price},00`;
    const url = `https://www.airbnb.com.br/rooms/${id}`;
    const stars = !isNil(star_rating) ? join('', repeat('★', parseInt(star_rating))) : '';

    return {
        title: `${property_type}: ${name}, ${price}`,
        comment: `
            ### ${name} ${stars}

            **${price}**

            Quartos: ${bedrooms}
            Camas: ${beds}
            Banheiros: ${bathrooms}
            Acomoda até: ${person_capacity}
            ${public_address}
            \n\n
            [Veja a acomodação](${url})

            ${ join('\n\n', map(picture => `![${property_type}](${picture})`, picture_urls)) }

        `
    };
}

function main(context, done) {
    const { location, guests, max_price, bedrooms, beds, bathrooms, currency } = context.params;

    return request.get(server)
        .query({
            locale: 'pt-BR',
            _limit: 20,
            location,
            guests,
            price_max: max_price,
            min_bedrooms: bedrooms,
            min_beds: beds,
            min_bathrooms: bathrooms,
            currency
        })
        .then(({ body }) => {
            const search = body.search_results || [];
            const alerts = map(createAlert, search);
            done(alerts);
        })
        .catch(() => done([]));
}

const currencies = [
    'AED', 'ARS', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CLP', 'COP',
    'CRC', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'IDR',
    'ILS', 'INR', 'JPY', 'KRW', 'MAD', 'MXN', 'MYR', 'NOK', 'NZD',
    'PEN', 'PHP', 'PLN', 'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB',
    'TRY', 'TWD', 'UAH', 'USD', 'UYU', 'VND', 'ZAR'
];

const params = {
    location: {
        description: 'Local',
        type: String
    },
    guests: {
        description: 'Pessoas',
        type: Natural,
        default: 1
    },
    max_price: {
        description: 'Valor máximo',
        type: Natural,
        default: 100
    },
    bedrooms: {
        description: 'Quartos',
        type: Natural,
        default: 1
    },
    beds: {
        description: 'Camas',
        type: Natural,
        default: 1
    },
    bathrooms: {
        description: 'Banheiros',
        type: Natural,
        default: 1
    },
    currency: {
        description: 'Moeda',
        type: OneOf(currencies),
        default: 'BRL'
    }
};

const app = create(main, { params });

module.exports = app;
