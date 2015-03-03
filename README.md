# property2
Property Search Application

Source APIs:
- http://api.phila.gov/ulrs/v3/
    - http://api.phila.gov/ulrs/v3/addresses/1234%20market?format=json
      Send rawAddress and get results with standardizedAddress as key for other calls.
    - http://api.phila.gov/ulrs/v3/addresses/340%2012th?format=json
      Ambiguous rawAddress can return more than one result.
    - https://api.phila.gov/ulrs/v3/addresses/1234%20MARKET%20ST/service-areas
      Most useful information from ULRS.
- http://phlapi.com/opaapi.html
