// Shown when the mod opens without a `src`, and what `herdr-app check` renders.
export const DEMO = `root = Stack([header, intro, overview, form])
header = CardHeader("opengpui", "OpenUI Lang drawn with native gpui elements")
intro = Callout("info", "Demo surface", "Open this mod with a **src** prop that points at a \`.oui\` file to show your own UI.")
overview = Card([CardHeader("First wave", "Components this build draws"), tags, tbl])
tags = Stack([Tag("Layout", null, "sm", "info"), Tag("Forms", null, "sm", "success"), Tag("Tables", null, "sm", "warning")], "row", "s")
tbl = Table([Col("Component", names), Col("Group", groups)])
names = ["Stack", "Card", "Form", "Input", "Table", "Callout"]
groups = ["Layout", "Content", "Forms", "Forms", "Tables", "Content"]
form = Form("feedback", btns, [nameField, msgField])
nameField = FormControl("Name", Input("name", "Your name", "text", { required: true }))
msgField = FormControl("Message", TextArea("message", "What should opengpui draw next?", 3, { required: true, minLength: 5 }))
btns = Buttons([Button("Send", @ToAssistant("Send feedback"), "primary"), Button("Later", @ToAssistant("Later"), "secondary")])
`;
