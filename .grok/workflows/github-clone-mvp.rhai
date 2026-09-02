let meta = #{
    name: "github-clone-mvp",
    description: "Finish an authentic GitHub clone MVP with Git hosting logic and shadcn/ui",
    when_to_use: "Build or finish the GitHub clone in this repo",
    phases: [
        #{ title: "Foundation", detail: "Git engine, platform store, default theme, app chrome" },
        #{ title: "Social", detail: "Home, profile, search, create repository, notifications" },
        #{ title: "Code", detail: "Repository file browser, blob, commits, clone/star/fork" },
        #{ title: "Collaboration", detail: "Issues, pull requests, diffs, merge via WAL" },
        #{ title: "Verify", detail: "Git tests, UI completeness, production build" },
        #{ title: "Fix", detail: "Close remaining gaps until the MVP is runnable" },
    ],
};

let ROOT = "/home/jack/workspace/github-clone";
let SPEC = ROOT + "/docs/mvp-spec.md";

fn impl_opts(label) {
    #{
        label: label,
        capability_mode: "all",
        agent_type: "general-purpose",
    }
}

fn preamble(root, spec) {
    let s = "You are implementing an authentic GitHub clone in " + root + ".\n";
    s += "Read " + spec + " FIRST with read_file and obey it. Use grep/list_dir/read_file before editing.\n";
    s += "NON-NEGOTIABLES:\n";
    s += "1. shadcn/ui primitives in components/ui only. Add missing ones with: pnpm dlx shadcn@latest add <name> --yes\n";
    s += "2. Default shadcn theme in app/globals.css as specified in the spec. Do not restore the Northstar blue palette.\n";
    s += "3. Git is a real content-addressable DAG + packfiles + reference transactions + linearizable WAL (Cursor blog Git at any scale). Objects are unreachable until the ref transaction commits.\n";
    s += "4. UI must look like github.com (dark header, owner/repo header, underline tabs, file table, issue rows, split diffs, profile heatmap) — not a generic SaaS dashboard.\n";
    s += "5. Product name is GitHub. Remove Northstar copy.\n";
    s += "6. Keep changes in this repo. Do not commit unless asked.\n";
    s += "7. After your slice, leave the app compiling. Prefer small focused files.\n";
    s += "8. Session user is octocat. Seed data via Git APIs, never hand-written SHAs.\n\n";
    s
}

// ---------------------------------------------------------------------------
phase("Foundation");
log("Building Git engine, platform store, default theme, and app chrome");

let p1 = preamble(ROOT, SPEC);
p1 += "YOUR SLICE: Foundation. Implement all of this before stopping.\n\n";
p1 += "A. Theme: reset app/globals.css :root and .dark to the exact default shadcn tokens in the spec. ";
p1 += "Remove the prefers-color-scheme dark override on :root. Add additive GitHub semantic utility classes.\n";
p1 += "B. shadcn: add card dropdown-menu dialog checkbox select textarea breadcrumb sheet popover label scroll-area command hover-card skeleton.\n";
p1 += "C. Git engine in lib/git/: objects (blob/tree/commit + Git SHA-1 header hashing), packfiles, ref transactions ";
p1 += "(prepare/commit/abort), WAL with CAS on the index, materialize, lsTree/log/catFile that WALK THE DAG from refs, ";
p1 += "diffTrees, merge, fork, compact. Export a clean API. Unreachable objects must not appear in log/lsTree.\n";
p1 += "D. Tests in lib/git/git.test.ts covering the 9 cases in the spec. Add tsx as a devDependency. ";
p1 += "Run pnpm exec tsx --test lib/git/git.test.ts and iterate until they pass.\n";
p1 += "E. Platform store in lib/platform/: users/orgs/repos/stars/watches/issues/PRs/comments/notifications/activity. ";
p1 += "Mutations go through the Git engine for anything that changes refs or objects. Persist snapshot to localStorage.\n";
p1 += "F. Seed via Git APIs: users octocat, gaearon, torvalds, hubot; orgs facebook, vercel; repos facebook/react, ";
p1 += "vercel/next.js, octocat/hello-world, octocat/spokes, gaearon/redux. Real file trees, 3+ commits, issues, PRs, labels.\n";
p1 += "G. App chrome: update app/layout.tsx metadata to GitHub. StoreProvider. components/github/header.tsx and footer.tsx ";
p1 += "matching Refero GitHub chrome (dark bar, search, Pull requests, Issues, Marketplace, Explore, bell, +, avatar). ";
p1 += "Replace app/page.tsx with a temporary placeholder that at least renders the header/footer so the app is not Northstar.\n";
p1 += "H. Current session user octocat.\n";
p1 += "Do not implement full repo/issue/PR pages yet. Do write the store APIs those pages will call.\n";
p1 += "When done, report the files you created and the test command result.\n";

let r1 = agent(p1, impl_opts("foundation"));
if r1 == () || r1.success != true {
    log("Foundation agent failed; continuing so later slices can recover");
}

// ---------------------------------------------------------------------------
phase("Social");
log("Home dashboard, profile, search, create repository, notifications");

let p2 = preamble(ROOT, SPEC);
p2 += "YOUR SLICE: Social surfaces. The foundation (lib/git, lib/platform, header/footer, default theme) should already exist. ";
p2 += "Read those files. Do NOT rewrite the Git engine unless tests are failing — if they fail, fix them first.\n\n";
p2 += "Implement, using shadcn primitives and the spec layouts:\n";
p2 += "1. app/page.tsx — logged-in GitHub HOME: left top-repos list, main activity feed, not stat cards.\n";
p2 += "2. app/[owner]/page.tsx — profile with Overview (pinned, heatmap, activity), Repositories, Stars tabs.\n";
p2 += "3. app/new/page.tsx — create repository form; calls platform create + optional README commit via push/WAL.\n";
p2 += "4. app/search/page.tsx — q param, tabs for repos/issues/PRs/users.\n";
p2 += "5. app/notifications/page.tsx — list + mark as read.\n";
p2 += "6. app/issues/page.tsx and app/pulls/page.tsx — global lists for the signed-in user (authored + assigned).\n";
p2 += "Wire Header search to /search and the command palette. Star/follow/create must mutate the store and re-render.\n";
p2 += "Reserved static routes must win over [owner].\n";
p2 += "When done, list routes you added.\n";

let r2 = agent(p2, impl_opts("social"));
if r2 == () || r2.success != true {
    log("Social agent failed; continuing");
}

// ---------------------------------------------------------------------------
phase("Code");
log("Repository file browser, blobs, commits, star/fork/clone");

let p3 = preamble(ROOT, SPEC);
p3 += "YOUR SLICE: Repository code surfaces. Read existing lib/git, lib/platform, components/github, and app routes. ";
p3 += "Do not rewrite the engine. Do not clobber home/profile pages.\n\n";
p3 += "Implement:\n";
p3 += "1. components/github/repo-header.tsx — owner/name, visibility, Watch/Fork/Star with counts, underline nav tabs ";
p3 += "(Code, Issues, Pull requests, Actions, Projects, Security, Insights) as Next.js links. Forked-from line.\n";
p3 += "2. app/[owner]/[repo]/page.tsx — branch picker, Go to file, Code clone dropdown, file table from lsTree(defaultBranch), ";
p3 += "latest commit strip, README, About sidebar (description, topics, stars/watch/forks, contributors, languages).\n";
p3 += "3. tree/[...path] and blob/[...path] — first path segment is the ref.\n";
p3 += "4. commits/[[...ref]] and commit/[sha] — log() grouped by day; commit detail with diffTrees vs first parent.\n";
p3 += "5. Star, watch, fork buttons call platform mutations. Fork uses git.fork then navigates to the new repo.\n";
p3 += "File table: directories first, commit message + relative time per entry.\n";
p3 += "When done, list routes and confirm facebook/react has a real tree from the Git engine.\n";

let r3 = agent(p3, impl_opts("code"));
if r3 == () || r3.success != true {
    log("Code agent failed; continuing");
}

// ---------------------------------------------------------------------------
phase("Collaboration");
log("Issues, pull requests, diffs, merge through the WAL");

let p4 = preamble(ROOT, SPEC);
p4 += "YOUR SLICE: Issues and pull requests. Read existing code. Reuse RepoHeader. Do not rewrite the Git engine.\n\n";
p4 += "Implement:\n";
p4 += "1. issues list + new issue form + issue detail (comments, labels, assignees, close/reopen).\n";
p4 += "2. pulls list + PR conversation (head/base, timeline, merge box) + PR files (file tree + split diff with ";
p4 += "gh-add-bg / gh-del-bg) + PR commits tab.\n";
p4 += "3. Merge must call git.merge / push so the WAL records a pack + ref transaction on the base branch. ";
p4 += "After merge, the PR is merged, base lsTree reflects the merge, and an activity event is emitted.\n";
p4 += "4. Open a PR from octocat/spokes:wal-index into octocat/spokes:main if seed did not already (or ensure seed has it).\n";
p4 += "Issue rows must match Refero: status icon, bold title, label pills, #n opened {rel} by {login}, assignees, comment count.\n";
p4 += "Green New issue / Merge pull request buttons (emerald-600 exception).\n";
p4 += "When done, describe how merge uses the WAL.\n";

let r4 = agent(p4, impl_opts("collaboration"));
if r4 == () || r4.success != true {
    log("Collaboration agent failed; continuing");
}

// ---------------------------------------------------------------------------
phase("Verify");
log("Adversarial checks: Git tests, UI completeness, production build");

let v_git = "Adversarially verify the Git engine in " + ROOT + ".\n";
v_git += "Read docs/mvp-spec.md and lib/git/. Run pnpm exec tsx --test lib/git/git.test.ts.\n";
v_git += "Independently confirm by reading the implementation (not just tests):\n";
v_git += "- SHA-1 Git object hashing exists\n";
v_git += "- Push is pack + ref transaction\n";
v_git += "- Objects are unreachable until refs commit\n";
v_git += "- WAL + CAS linearizes pushes\n";
v_git += "- log/lsTree walk the DAG from refs, they do not scan the object db\n";
v_git += "- merge and fork exist\n";
v_git += "Write docs/verify-git.md with: ready (yes/no), evidence (file:line), blockers.\n";
v_git += "Do not edit production code. ready=yes only with evidence you inspected.\n";

let v_ui = "Adversarially verify the GitHub clone UI in " + ROOT + ".\n";
v_ui += "Read docs/mvp-spec.md. Use glob/grep/read_file to inspect app/ and components/.\n";
v_ui += "Confirm these routes exist and are not the old Northstar dashboard:\n";
v_ui += "/ /new /search /issues /pulls /notifications /[owner] /[owner]/[repo] tree blob commits commit issues issue-detail pulls pull pull/files.\n";
v_ui += "Confirm header is GitHub-like (dark bar, search, Pull requests, Issues). Confirm default shadcn tokens in globals.css ";
v_ui += "(no Northstar blue primary). Confirm shadcn primitives are used (Button, Input, Tabs, etc from components/ui).\n";
v_ui += "Confirm star/fork/create/merge/issue comment are wired to the platform store, not flash() no-ops.\n";
v_ui += "Write docs/verify-ui.md with ready (yes/no), missing routes, leftover Northstar, blockers.\n";
v_ui += "Do not edit production code.\n";

let v_build = "Verify the app builds in " + ROOT + ".\n";
v_build += "Run pnpm install if needed, then pnpm exec tsx --test lib/git/git.test.ts, then pnpm build.\n";
v_build += "Write docs/verify-build.md with the exact command outputs (pass/fail), and any TypeScript errors.\n";
v_build += "Do not edit production code in this step. Capture evidence.\n";

let verifiers = [
    #{ prompt: v_git, label: "verify-git", capability_mode: "execute", agent_type: "general-purpose" },
    #{ prompt: v_ui, label: "verify-ui", capability_mode: "read-only", agent_type: "general-purpose" },
    #{ prompt: v_build, label: "verify-build", capability_mode: "execute", agent_type: "general-purpose" },
];
let vres = parallel(verifiers);
let vi = 0;
for vr in vres {
    if vr == () || vr.success != true {
        log("Verifier slot " + vi.to_string() + " failed or empty");
    }
    vi += 1;
}

// ---------------------------------------------------------------------------
phase("Fix");
log("Closing remaining gaps from verification");

let pfix = preamble(ROOT, SPEC);
pfix += "YOUR SLICE: Fixer. Read docs/mvp-spec.md, docs/verify-git.md, docs/verify-ui.md, docs/verify-build.md if they exist, ";
pfix += "and inspect the repo. Make the MVP actually done.\n\n";
pfix += "Fix every blocker: failing git tests, missing routes, Northstar leftovers, build errors, merge not using WAL, ";
pfix += "theme not default shadcn, dead buttons, missing seed, hydration issues.\n";
pfix += "Re-run pnpm exec tsx --test lib/git/git.test.ts and pnpm build until both pass.\n";
pfix += "Do not add unrelated features (Actions runners, Gists, Projects boards, real Git HTTP protocol).\n";
pfix += "When done, write docs/verify-final.md listing what you fixed and the final test/build results.\n";

let rfix = agent(pfix, impl_opts("fixer"));
if rfix == () || rfix.success != true {
    log("Fixer failed");
}

let report = "GitHub clone MVP workflow finished. Spec: " + SPEC + ". ";
report += "Inspect docs/verify-final.md, docs/verify-git.md, docs/verify-ui.md, docs/verify-build.md for evidence.";
let path = write_scratch_file("report.md", report);
complete(#{ path: path, report: report });
