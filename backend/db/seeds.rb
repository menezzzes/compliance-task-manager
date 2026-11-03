# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Production runs this file on every start. Sample data only goes into an empty table,
# so a task the user deleted or renamed does not come back.
return unless Task.none?

today = Date.current

[
  { title: "Submit HMDA LAR to the CFPB", category: "hmda", priority: "high", status: "pending", due_date: today - 12,
    description: "File the annual Loan/Application Register through the HMDA Platform." },
  { title: "Run HMDA LAR edit checks", category: "hmda", priority: "medium", status: "completed", due_date: today - 30,
    description: "Clear syntactical, validity and quality edits before submission." },
  { title: "Prepare CRA exam public file", category: "cra", priority: "high", status: "pending", due_date: today + 21,
    description: "Update branch lists, services, HMDA notices and public comments." },
  { title: "Update CRA assessment area maps", category: "cra", priority: "low", status: "pending", due_date: nil,
    description: "Reflect the latest branch openings and census tract changes." },
  { title: "Document CRA community development loans", category: "cra", priority: "medium", status: "completed", due_date: today - 45,
    description: "Collect support showing the community development purpose of each loan." },
  { title: "Complete redlining risk review", category: "fair_lending", priority: "high", status: "pending", due_date: today - 3,
    description: "Compare application and origination volume in majority-minority tracts with peers." },
  { title: "Finish Fair Lending audit of pricing exceptions", category: "fair_lending", priority: "high", status: "pending", due_date: today + 10,
    description: "Test rate and fee exceptions for disparities across prohibited bases." },
  { title: "Update Fair Lending policy", category: "fair_lending", priority: "low", status: "completed", due_date: today - 60,
    description: "Align the policy with the board-approved risk assessment." },
  { title: "Validate Section 1071 data points", category: "section_1071", priority: "high", status: "pending", due_date: today + 45,
    description: "Confirm small business applications capture every required data point." },
  { title: "Test the Section 1071 firewall", category: "section_1071", priority: "medium", status: "pending", due_date: nil,
    description: "Verify underwriters cannot access demographic data collected from applicants." },
  { title: "Respond to CFPB portal complaint", category: "complaints", priority: "high", status: "pending", due_date: today - 1,
    description: "Send the response and supporting documents within the portal deadline." },
  { title: "Close out Q3 complaint log", category: "complaints", priority: "medium", status: "completed", due_date: today - 20,
    description: "Confirm every complaint has a documented root cause and resolution." },
  { title: "Approve mortgage marketing materials", category: "marketing_compliance", priority: "medium", status: "pending", due_date: today + 5,
    description: "Review disclosures and Equal Housing Lender language before launch." },
  { title: "Review social media ads for UDAAP", category: "marketing_compliance", priority: "low", status: "completed", due_date: nil,
    description: "Check that claims are accurate and not misleading." },
  { title: "Schedule annual compliance training", category: "other", priority: "low", status: "pending", due_date: today + 30,
    description: "Book sessions on BSA, Fair Lending and complaint handling for all staff." }
].each do |attributes|
  # The block only runs for a new task, so a second run creates no task and no event.
  Task.find_or_create_by!(title: attributes[:title]) do |task|
    task.assign_attributes(attributes)
  end
end
