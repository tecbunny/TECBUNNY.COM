```markdown
{
  "version": "6.0",
  "screens": [
    {
      "id": "MAIN_SCREEN",
      "title": "Service Request",
      "data": {},
      "terminal": true,
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "Image",
            "src": "https://tecbunny.com/images/logo.png",
            "height": 100,
            "scale-type": "contain"
          },
          {
            "type": "TextHeading",
            "text": "Welcome to TecBunny"
          },
          {
            "type": "TextBody",
            "text": "Please provide your details and select the service you need."
          },
          {
            "type": "Form",
            "name": "service_request_form",
            "children": [
              {
                "type": "TextInput",
                "name": "full_name",
                "label": "Full Name",
                "required": true,
                "input-type": "text"
              },
              {
                "type": "TextInput",
                "name": "city",
                "label": "City",
                "required": true,
                "input-type": "text"
              },
              {
                "type": "TextInput",
                "name": "state",
                "label": "State",
                "required": true,
                "input-type": "text"
              },
              {
                "type": "TextHeading",
                "text": "Select Service"
              },
              {
                "type": "RadioButtonsGroup",
                "name": "selected_service",
                "label": "Service Type",
                "required": true,
                "data-source": [
                  {
                    "id": "new_cctv",
                    "title": "New - CCTV"
                  },
                  {
                    "id": "new_it",
                    "title": "New - IT Services"
                  },
                  {
                    "id": "new_automation",
                    "title": "New - Home Automation"
                  },
                  {
                    "id": "repair_cctv",
                    "title": "Repair - CCTV"
                  },
                  {
                    "id": "repair_it",
                    "title": "Repair - IT Services"
                  },
                  {
                    "id": "upgrade_cctv",
                    "title": "Upgrade - CCTV"
                  },
                  {
                    "id": "upgrade_it",
                    "title": "Upgrade - IT Services"
                  },
                  {
                    "id": "custom",
                    "title": "Custom / Get Quote"
                  }
                ]
              },
              {
                "type": "TextArea",
                "name": "additional_details",
                "label": "Additional Details (Optional)",
                "required": false
              }
            ]
          },
          {
            "type": "Footer",
            "label": "Submit Request",
            "on-click-action": {
              "name": "complete",
              "payload": {
                "name": "${form.full_name}",
                "city": "${form.city}",
                "state": "${form.state}",
                "service": "${form.selected_service}",
                "details": "${form.additional_details}"
              }
            }
          }
        ]
      }
    }
  ]
}
```
