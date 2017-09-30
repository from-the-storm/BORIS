#!/usr/bin/env bash
# Generate a self-signed wildcard certificate in the current directory

# Set the wildcard domain we want to use
DOMAIN="*.boris.local"
DOMAIN2="boris.local"

# Name used for file output
KEY_NAME="boris-self"

# A blank passphrase
PASSPHRASE=""

# Generate our OpenSSL config file
cp /usr/local/etc/openssl/openssl.cnf "$KEY_NAME.conf"
CONFIG_EXTRA="
[ alternate_names ]

DNS.1        = $DOMAIN
DNS.2        = $DOMAIN2
"
echo "$CONFIG_EXTRA" >> "$KEY_NAME.conf"
# Add "subjectAltName      = @alternate_names" to the [ v3_ca ] section:
sed -i '' $'s/\[ v3_ca \]/\[ v3_ca \]\\\nsubjectAltName = @alternate_names/' "$KEY_NAME.conf"
# Uncomment "copy_extensions = copy":
sed -i '' 's/# copy_extensions = copy/copy_extensions = copy/' "$KEY_NAME.conf"

# Set our CSR variables
SUBJ="
C=CA
ST=British Columbia
O=From the Storm
localityName=Vancouver
commonName=$DOMAIN
organizationalUnitName=
emailAddress=
"

# Generate our Private Key, CSR and Certificate
openssl genrsa -out "$KEY_NAME.key" 4096
openssl req -new -x509 -subj "$(echo -n "$SUBJ" | tr "\n" "/")" -key "$KEY_NAME.key" -out "$KEY_NAME.crt" -passin pass:$PASSPHRASE -config "$KEY_NAME.conf" -days 900
rm "$KEY_NAME.conf"
