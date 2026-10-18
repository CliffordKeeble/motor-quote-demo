# Deploying Fenmoor Motor: the runbook

For Cliff, in order. Nothing in it has been run: `azure-pipelines.yml` was checked as YAML only,
because there is no Azure DevOps organisation to run it in. Where a step is a command, it is
exact. Where it is a click, it says so, because Azure DevOps has no command for it.

The Azure side already exists: resource group `rg-motor-quote-demo` holds two Static Web Apps on
the Free plan, `swa-motor-quote-react` and `swa-motor-quote-angular`, from `infra/main.bicep`.
This pipeline deploys the React one. Replace `<ORG>` below with your organisation's name.

## 1. An Azure DevOps organisation, billing linked to the subscription

*Portal.* Create one at <https://dev.azure.com> ("Create new organization"). Learn's *Create an
organization* (dated 4 Mar 2026) picks the Azure subscription inside the **New organization**
form: choose the subscription that holds `rg-motor-quote-demo` there, and the billing is linked as
the organisation is made.

The separate billing step is only for an organisation that already exists (the one 1016-SKETCH-1
found): **Organization settings, Billing, Set up billing**, and pick the same subscription. That
link is what grants the free Microsoft-hosted job: 1,800 minutes a month. Without it, the first
run is refused with "No hosted parallelism has been purchased or granted". Setting the billing up
does not by itself cost anything: the paid extras are separate items you leave at zero.

## 2. A private project

```powershell
az extension add --name azure-devops
az devops project create --name motor-quote-demo --visibility private --organization https://dev.azure.com/<ORG>
```

(`az login` first if you are not signed in.)

## 3. Push the code to GitHub

*Existing Azure Pipelines YAML file*, in the next step, reads `azure-pipelines.yml` from GitHub's
`main`, so the code has to be there first. The code is on `main` in the local clone:

```powershell
git -C C:\Dev\motor-quote-demo push origin main
```

No pipeline exists yet, so this deploys nothing.

## 4. The pipeline, from this GitHub repository

*Portal.* In the project: **Pipelines, Create Pipeline, GitHub**. If the Azure Pipelines OAuth
prompt names any account other than `CliffordKeeble`, cancel it and sign in to GitHub as
`CliffordKeeble` first, then start again. Approve the **Azure Pipelines** GitHub app for
`CliffordKeeble/motor-quote-demo` when it asks (this is the one place GitHub is given access),
choose **Existing Azure Pipelines YAML file**, branch `main`, path `/azure-pipelines.yml`.
**Save**, do not run yet. Name it `motor-quote-demo`.

## 5. The deployment token, as a secret variable

Copy the token to the clipboard without printing it:

```powershell
az staticwebapp secrets list --name swa-motor-quote-react --resource-group rg-motor-quote-demo --query properties.apiKey -o tsv | Set-Clipboard
```

*Portal.* **Pipelines, motor-quote-demo, Edit, Variables, New variable.** Name `SWA_TOKEN_REACT`,
paste, tick **Keep this value secret**, **OK**, **Save**. Then clear the clipboard:

```powershell
Set-Clipboard -Value ' '
```

Never paste the token into a file or a chat. If one is ever pasted somewhere, rotate it:

```powershell
az staticwebapp secrets reset-api-key --name swa-motor-quote-react --resource-group rg-motor-quote-demo
```

## 6. Run the pipeline

The code is already on GitHub (step 3), so nothing starts by itself. Start the first run by hand,
now that the secret variable is set (from here on, a push to `main` starts it):

```powershell
az pipelines run --name motor-quote-demo --branch main --project motor-quote-demo --organization https://dev.azure.com/<ORG>
```

Build runs the .NET and the React gates; Deploy runs after it, on `main` only. When it finishes,
the live address is the default hostname of the app:

```powershell
az staticwebapp show --name swa-motor-quote-react --resource-group rg-motor-quote-demo --query defaultHostname -o tsv
```

Open it and run the worked example: **Fill in example answers**, Continue, Continue, Get my
quote. The price is £227.19 a year.

The run checks that for you as its last step, **Check the live site answers**
(`tools/smoke_live.py`): within six minutes the live page must load this build's script, and the
API must answer the car list and price the worked example at £227.19. If not, the run goes red and
says what the site last answered; the deploy has already replaced the site by then, so look at it,
and revert and push if it is down. The same check runs by hand from this machine after any deploy:

```cmd
python C:\Dev\motor-quote-demo\tools\smoke_live.py https://wonderful-mushroom-05443000f.6.azurestaticapps.net
```

## 7. A budget alert on the resource group, at £1

*Portal.* **Cost Management, Budgets, Add.** Scope: the resource group `rg-motor-quote-demo`.
Amount £1, monthly. Alert condition: actual cost, 100% of the budget, and your email address.
(The Free plan cannot bill for the apps. This catches anything else that ever lands in the group.)

## 8. If the hosted job never starts

Microsoft says a new organisation can wait a few days for the free grant (there is a request form
linked from the "No hosted parallelism" error). The fallback is a **self-hosted agent on this
machine**, which is also free (Microsoft: one self-hosted job, unlimited minutes).

One catch, from the task's own reference page: **`AzureStaticWebApp@0` runs on Linux agents
only.** A Windows agent can build and test but cannot run the deploy step. So the agent must be
Linux (an Ubuntu distribution under WSL2, with Docker, which the task uses), and in
`azure-pipelines.yml` the `pool:` block becomes `pool: { name: Default }`.

*Portal, then command.* **Organization settings, Agent pools, Default, New agent, Linux**, and
follow the commands it shows inside the Ubuntu shell: download the agent, then
`./config.sh` (it asks for the organisation URL and a personal access token), then `./run.sh`.

If a Linux agent is more than you want to set up, skip the pipeline's Deploy and deploy from this
machine with the Static Web Apps CLI, which is what a first deploy by hand looks like:

```powershell
dotnet publish C:\Dev\motor-quote-demo\src\Fenmoor.Api -c Release -o C:\Dev\motor-quote-demo\publish\api
$env:SWA_CLI_DEPLOYMENT_TOKEN = az staticwebapp secrets list --name swa-motor-quote-react --resource-group rg-motor-quote-demo --query properties.apiKey -o tsv
npx @azure/static-web-apps-cli deploy C:\Dev\motor-quote-demo\web\react\dist --api-location C:\Dev\motor-quote-demo\publish\api --env production
Remove-Item Env:SWA_CLI_DEPLOYMENT_TOKEN
```

The token goes in an environment variable the CLI reads (`SWA_CLI_DEPLOYMENT_TOKEN`), and is never
printed. The API runtime (`dotnet-isolated:10.0`) is read from `staticwebapp.config.json`, which is
in `dist`. The CLI's documentation only says `--api-location` is an API *source* folder; it does
not say a published .NET folder is accepted. This command has not been run, and is the fallback's
own risk. (`publish/` is in `.gitignore`.)
