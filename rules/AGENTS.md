# Working with di-framework

This plugin provides the `di-framework` skill for framework tasks,
`principled-engineering` for engineering guidance, and MCP tools for documentation
and diagnostics. Load the resources relevant to the request as needed.

For broad requests, follow **inspect → design → implement → verify → deliver**.
For focused changes or reviews, enter the relevant stage after establishing the
project context. Adapt the workflow to the requested scope.

1. **Inspect.** Read project instructions, existing code, package scripts, installed
   versions, lockfiles, and relevant configuration. Establish the current behavior
   and the desired outcome. The framework skill's discovery and diagnostics resources
   help locate documentation, examples, and evidence for failures.
2. **Design.** Consider the approaches supported by the installed framework and the
   project's conventions. Consult composition, architecture, or task-specific
   resources where useful. Distinguish API requirements from recommendations and
   explain material tradeoffs. Use engineering guidance when it helps the decision.
3. **Implement.** Make the requested change using the relevant framework resource
   and the project's existing toolchain. Check version-specific APIs and command
   options against documentation, installed declarations, or command help.
4. **Verify.** Run the project's checks appropriate to the affected behavior.
   Testing, toolchain, and quality/CI resources describe available approaches.
   Static diagnostics, in-memory tests, native builds, and deployment checks provide
   different evidence; report what each check establishes and what remains unverified.
5. **Deliver.** Describe the resulting behavior, decisions, checks performed, and
   any remaining limits. When deployment is part of the request, consult the platform
   and kube resources for the selected environment and verify the deployed result.

For documentation lookup, use `di_search_docs` for the target project's resolved
version, then `di_window` with the version and cursor returned by the search.
The discovery resource explains provenance and alternatives when matching docs
are unavailable. `di_inspect_graph` and `di_validate_tokens` support diagnosis;
their analysis limits are described in the diagnostics resource.

Requests using retired framework skill names route to the corresponding resource
in `di-framework`. The framework skill's resource table covers new apps, composition,
transports, persistence, actors, AI, testing, toolchain, and platform work.
