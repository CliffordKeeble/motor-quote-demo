targetScope = 'resourceGroup'

@description('Region for the Static Web Apps resource metadata.')
param location string

@description('Name of the React front end.')
param reactName string = 'swa-motor-quote-react'

@description('Name of the Angular front end.')
param angularName string = 'swa-motor-quote-angular'

// No repository link: the pipeline deploys with a deployment token.
resource swaReact 'Microsoft.Web/staticSites@2023-12-01' = {
  name: reactName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

resource swaAngular 'Microsoft.Web/staticSites@2023-12-01' = {
  name: angularName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output reactHostname string = swaReact.properties.defaultHostname
output angularHostname string = swaAngular.properties.defaultHostname
